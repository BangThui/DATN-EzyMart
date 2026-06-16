const OrderModel = require('../models/orderModel');
const CartModel = require('../models/cartModel');
const { getIO } = require('../socket');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// createOrder: Bỏ customer/giaodich, dùng orders + order_items
// getOrdersByUserCode → getOrdersByUserId (dùng user_id)
// mahang = order_id
// ───────────────────────────────────────────────────────────────────────────

// Tạo đơn hàng
exports.createOrder = async (req, res) => {
    try {
        const { name, phone, email, address, payments, note, cart_items, user_id, shipping_method, pickup_time } = req.body;

        if (!cart_items || cart_items.length === 0) {
            return res.status(400).json({ error: 'Giỏ hàng trống' });
        }

        // Validate pickup_time nếu là đơn nhận tại cửa hàng
        if (shipping_method === 'pickup') {
            if (!pickup_time) {
                return res.status(400).json({ error: 'Vui lòng chọn thời gian hẹn đến lấy hàng.' });
            }
            const pt = new Date(pickup_time);
            if (isNaN(pt.getTime())) {
                return res.status(400).json({ error: 'Thời gian hẹn không hợp lệ.' });
            }
            if (pt <= new Date()) {
                return res.status(400).json({ error: 'Thời gian hẹn phải là trong tương lai.' });
            }
            const hours = pt.getHours();
            const minutes = pt.getMinutes();
            const totalMinutes = hours * 60 + minutes;
            if (totalMinutes < 7 * 60 || totalMinutes > 22 * 60) {
                return res.status(400).json({ error: 'Giờ hẹn phải nằm trong khung 07:00 – 22:00.' });
            }
        }

        // Tính tổng tiền
        const total_price = cart_items.reduce((sum, item) => {
            const price = (item.variant_discount && Number(item.variant_discount) > 0 && Number(item.variant_discount) < Number(item.variant_price))
                ? item.variant_discount
                : item.variant_price;
            return sum + Number(price) * (item.product_quantity || item.quantity || 1);
        }, 0);

        // Tạo đơn hàng trong orders + order_items
        const order_id = await OrderModel.createOrder({
            user_id: user_id || null,
            cart_items,
            total_price,
            note,
            payments,
            shipping_method: shipping_method || 'delivery',
            pickup_time: shipping_method === 'pickup' ? pickup_time : null,
        });

        // Xoá giỏ hàng sau khi đặt thành công
        if (user_id) {
            await CartModel.clearByUserId(user_id);
        }

        res.status(201).json({
            message: 'Đặt hàng thành công',
            mahang: order_id,
            order_id,
            totalPayment: total_price
        });

        // --- SOCKET: Thông báo đơn mới cho Admin ---
        try {
            const io = getIO();
            io.emit('new_order_alert', {
                order_id,
                customer_name: name || 'Khách vãng lai',
                total_price,
                shipping_method: shipping_method || 'delivery',
                created_at: new Date().toISOString(),
            });

            // --- SOCKET: Cập nhật tồn kho cho tất cả client ---
            for (const item of cart_items) {
                const [[variant]] = await OrderModel.getVariantStockById(item.variant_id);
                if (variant) {
                    io.emit('inventory_change', {
                        variantId: item.variant_id,
                        productId: item.product_id,
                        newStock: variant.variant_quantity,
                    });
                }
            }
        } catch (socketErr) {
            console.warn('[Socket] Emit error (non-critical):', socketErr.message);
        }
    } catch (err) {
        console.error('Create order error:', err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message || 'Đặt hàng thất bại' });
    }
};

// Lấy đơn hàng theo user_id (thay thế getOrdersByUserCode)
exports.getOrdersByUserId = async (req, res) => {
    try {
        const { user_id } = req.params;
        const [rows] = await OrderModel.getByUserId(user_id);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy đơn hàng' });
    }
};

// Backward-compat: getOrdersByUserCode vẫn hoạt động nếu FE gọi với user_code
// Trong schema mới user_code đã bỏ, nên map user_code = user_id nếu cần
exports.getOrdersByUserCode = async (req, res) => {
    try {
        const { user_code } = req.params;
        // user_code trong v2 tương đương user_id trong final
        const [rows] = await OrderModel.getByUserId(user_code);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy đơn hàng' });
    }
};

// Lấy chi tiết đơn hàng theo mahang (order_id)
exports.getOrderByMahang = async (req, res) => {
    try {
        const { mahang } = req.params;
        const [rows] = await OrderModel.getByMahang(mahang);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
        
        const orderInfo = rows[0];
        const userRole = req.user.role;
        const isAdmin = userRole === 0 || userRole === '0' || userRole === 2 || userRole === '2';
        if (!isAdmin && String(orderInfo.user_id) !== String(req.user.user_id)) {
            return res.status(403).json({ error: 'Bạn không có quyền xem đơn hàng này' });
        }

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy chi tiết đơn hàng' });
    }
};

// [ADMIN] Lấy tất cả đơn hàng (có hỗ trợ lọc)
exports.getAllOrders = async (req, res) => {
    try {
        const { search, status, method } = req.query;
        const [rows] = await OrderModel.getAll({ search, status, method });
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách đơn hàng' });
    }
};

// [ADMIN] Cập nhật trạng thái đơn hàng
// Nhận { tinhtrang } (số 0-4) hoặc { order_status } (chuỗi enum) từ FE
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { tinhtrang, order_status } = req.body;
        const statusValue = tinhtrang !== undefined ? tinhtrang : order_status;

        // Lấy user_id của đơn hàng để gửi socket riêng tới khách hàng
        const [[orderInfo]] = await OrderModel.getOrderUserInfo(id);
        await OrderModel.updateStatus(id, statusValue);
        res.json({ message: 'Cập nhật trạng thái đơn hàng thành công' });

        // --- SOCKET: Đồng bộ trạng thái đơn hàng tới tất cả (Admin & Khách hàng) ---
        try {
            const io = getIO();
            io.emit('order_status_updated', {
                order_id: Number(id),
                order_status: statusValue,
                user_id: orderInfo ? orderInfo.user_id : null
            });
        } catch (socketErr) {
            console.warn('[Socket] Emit error (non-critical):', socketErr.message);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật trạng thái đơn hàng' });
    }
};

// [CUSTOMER] Khách hàng xác nhận đã nhận hàng
exports.customerUpdateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await OrderModel.getByMahang(id);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
        
        const currentStatus = rows[0].order_status;
        // Chỉ cho phép cập nhật khi đơn hàng đang giao (trạng thái: 'shipping' hoặc 2 đối với data cũ)
        if (currentStatus !== 'shipping' && currentStatus !== 2) {
            return res.status(400).json({ error: 'Chỉ có thể xác nhận khi đơn hàng đang được giao.' });
        }
        
        await OrderModel.updateStatus(id, 'completed');
        res.json({ message: 'Xác nhận nhận hàng thành công' });

        // --- SOCKET: Thông báo hoàn thành đơn hàng real-time ---
        try {
            const io = getIO();
            io.emit('order_status_updated', {
                order_id: Number(id),
                order_status: 'completed',
                updated_by: 'customer',
                user_id: rows[0].user_id
            });
        } catch (socketErr) {
            console.warn('[Socket] Emit error (non-critical):', socketErr.message);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xác nhận nhận hàng' });
    }
};

// [CUSTOMER] Khách hàng hủy đơn hàng
exports.customerCancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const [[orderInfo]] = await OrderModel.getOrderUserInfo(id);
        const restoredItems = await OrderModel.cancelOrderWithStockRestore(id);
        res.json({ message: 'Hủy đơn hàng thành công' });

        // --- SOCKET: Hoàn kho → cập nhật tồn kho real-time ---
        try {
            const io = getIO();
            if (Array.isArray(restoredItems)) {
                for (const item of restoredItems) {
                    io.emit('inventory_change', {
                        variantId: item.variant_id,
                        productId: item.product_id,
                        newStock: item.newStock,
                    });
                }
            }
            // Thông báo đồng bộ lại trạng thái cho tất cả (để Admin & Khách hàng cùng thấy)
            io.emit('order_status_updated', {
                order_id: Number(id),
                order_status: 'cancelled',
                updated_by: 'customer',
                user_id: orderInfo ? orderInfo.user_id : null
            });
        } catch (socketErr) {
            console.warn('[Socket] Emit error (non-critical):', socketErr.message);
        }
    } catch (err) {
        console.error(err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message || 'Lỗi hủy đơn hàng' });
    }
};

// [ADMIN] Cập nhật pickup_status cho đơn hàng nhận tại cửa hàng
exports.updatePickupStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { pickup_status } = req.body;

        const validStatuses = ['waiting', 'prepared', 'received'];
        if (!pickup_status || !validStatuses.includes(pickup_status)) {
            return res.status(400).json({
                error: `pickup_status không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(', ')}`
            });
        }

        // Model sẽ thực hiện transaction: cập nhật pickup_status,
        // và nếu 'received' thì tự động set order_status='completed' + payment_status='paid' (COD)
        const result = await OrderModel.updatePickupStatus(id, pickup_status);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy đơn hàng nhận tại cửa hàng.' });
        }

        // Trả về đầy đủ thông tin để FE cập nhật cả 2 cột ngay lập tức
        res.json({
            message: pickup_status === 'received'
                ? 'Đã giao hàng thành công. Đơn hàng hoàn thành!'
                : pickup_status === 'prepared'
                ? 'Đã soạn xong hàng. Khách hàng đã được thông báo!'
                : 'Cập nhật trạng thái chuẩn bị hàng thành công',
            pickup_status: result.pickup_status,
            order_status: result.order_status,
            payment_status: result.payment_status,
            was_prepared: result.was_prepared,
            was_completed: result.was_completed,
        });

        // --- SOCKET: Phát sóng đồng bộ ---
        try {
            const io = getIO();

            // 1. Luôn emit pickup_status (để cập nhật cột "Phương thức giao" admin)
            io.emit('pickup_status_updated', {
                order_id: Number(id),
                pickup_status: result.pickup_status,
            });

            // 2. Emit order_status khi có thay đổi (prepared → processing, received → completed)
            if (result.was_prepared || result.was_completed) {
                // Fetch user_id for socket notification
                const [[orderInfo]] = await OrderModel.getOrderUserInfo(id);
                io.emit('order_status_updated', {
                    order_id: Number(id),
                    order_status: result.order_status,
                    pickup_status: result.pickup_status,
                    updated_by: 'admin_pickup',
                    user_id: orderInfo ? orderInfo.user_id : null
                });
            }
        } catch (socketErr) {
            console.warn('[Socket] Emit error (non-critical):', socketErr.message);
        }
    } catch (err) {
        console.error(err);
        const status = err.statusCode || 500;
        res.status(status).json({ error: err.message || 'Lỗi cập nhật trạng thái chuẩn bị hàng' });
    }
};

// [API] Xuất hóa đơn PDF
exports.exportInvoicePDF = async (req, res) => {
    try {
        const order_id = req.params.order_id || req.query.order_id;
        if (!order_id) {
            return res.status(400).json({ error: 'Thiếu mã đơn hàng' });
        }

        const [rows] = await OrderModel.getByMahang(order_id);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
        }

        // Lấy thông tin đơn hàng chung từ dòng đầu tiên
        const orderInfo = rows[0]; 

        // Kiểm tra quyền truy cập
        const userRole = req.user.role;
        const isAdmin = userRole === 0 || userRole === '0' || userRole === 2 || userRole === '2';
        if (!isAdmin && String(orderInfo.user_id) !== String(req.user.user_id)) {
            return res.status(403).json({ error: 'Bạn không có quyền xem hóa đơn này' });
        }

        const doc = new PDFDocument({ size: 'A5', margin: 30 });
        
        // Đường dẫn font chữ (bắt buộc hỗ trợ Tiếng Việt)
        const fontPathRegular = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
        
        // Cấu hình header response cho file PDF stream
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="invoice_${order_id}.pdf"`);
        doc.pipe(res);

        // Header
        doc.font(fontPathBold).fontSize(14).text('EZYMART - THỰC PHẨM SẠCH', { align: 'center' });
        doc.font(fontPathRegular).fontSize(10).text('Địa chỉ:Tổ 1, Phường Yên Nghĩa, Hà Nội', { align: 'center' });
        doc.text('Hotline: 0349484515', { align: 'center' });
        doc.moveDown(2);

        // Title
        doc.font(fontPathBold).fontSize(16).text('HÓA ĐƠN BÁN HÀNG', { align: 'center' });
        doc.moveDown(1);

        // Thông tin chung
        doc.font(fontPathRegular).fontSize(10);
        doc.text(`Mã hóa đơn: ${orderInfo.mahang}`);
        doc.text(`Ngày lập: ${new Date(orderInfo.ngayDatHang || Date.now()).toLocaleString('vi-VN')}`);
        doc.text(`Khách hàng: ${orderInfo.customer_name || 'Khách lẻ'}`);
        
        const shippingMethodName = orderInfo.shipping_method === 'pickup' ? 'Nhận tại cửa hàng' : 'Giao hàng COD';
        doc.text(`Hình thức nhận hàng: ${shippingMethodName}`);
        doc.moveDown(1);

        // Header bảng sản phẩm
        const tableTop = doc.y;
        const columnX = [30, 60, 220, 260, 320]; // Tọa độ X cho STT, Tên SP, SL, Đơn giá, Thành tiền
        
        doc.font(fontPathBold);
        doc.text('STT', columnX[0], tableTop);
        doc.text('Tên sản phẩm', columnX[1], tableTop);
        doc.text('SL', columnX[2], tableTop, { width: 30, align: 'center' });
        doc.text('Đơn giá', columnX[3], tableTop, { width: 50, align: 'right' });
        doc.text('Thành tiền', columnX[4], tableTop, { width: 70, align: 'right' });
        
        const hrY = doc.y + 5;
        doc.moveTo(30, hrY).lineTo(390, hrY).stroke(); // Kẻ ngang (Chiều rộng A5 ~419.53)
        
        // Danh sách sản phẩm
        doc.font(fontPathRegular);
        let currentY = doc.y + 10;
        let totalAmount = 0;

        rows.forEach((item, index) => {
            const name = item.product_name + (item.variant_name ? ` - ${item.variant_name}` : '');
            const qty = item.soluong || 1;
            const price = Number(item.variant_price) || 0;
            const amount = qty * price;
            totalAmount += amount;

            // Chuyển trang nếu sắp hết giấy (A5 cao ~595)
            if (currentY > 520) {
                doc.addPage({ size: 'A5', margin: 30 });
                currentY = 30;
                doc.font(fontPathRegular);
            }

            doc.text(`${index + 1}`, columnX[0], currentY);
            doc.text(name, columnX[1], currentY, { width: 150 });
            
            // Tính toán Y tiếp theo dựa trên độ dài của tên SP
            const nextY = doc.y; 
            
            doc.text(`${qty}`, columnX[2], currentY, { width: 30, align: 'center' });
            doc.text(price.toLocaleString('vi-VN'), columnX[3], currentY, { width: 50, align: 'right' });
            doc.text(amount.toLocaleString('vi-VN'), columnX[4], currentY, { width: 70, align: 'right' });

            currentY = Math.max(nextY, currentY + 15) + 5;
        });

        // Kẻ ngang cuối bảng
        doc.moveTo(30, currentY).lineTo(390, currentY).stroke();
        currentY += 10;

        // Tổng tiền (Sử dụng tongDoanhThu từ DB nếu có, hoặc tổng đã tính)
        const finalTotal = Number(orderInfo.tongDoanhThu) || totalAmount;
        doc.font(fontPathBold).fontSize(12);
        doc.text('Tổng tiền thanh toán:', 30, currentY);
        doc.text(`${finalTotal.toLocaleString('vi-VN')} VNĐ`, 200, currentY, { width: 190, align: 'right' });
        doc.moveDown(2);

        // Footer cảm ơn
        doc.font(fontPathRegular).fontSize(10);
        if (orderInfo.shipping_method === 'pickup') {
            doc.text('Cảm ơn quý khách đã mua sắm tại EzyMart! Vui lòng lưu mã hóa đơn này để đối chiếu với nhân viên khi đến nhận hàng.', 30, doc.y, { align: 'center', width: 360 });
        } else {
            doc.text('Cảm ơn quý khách đã mua sắm tại EzyMart! Đơn hàng sẽ được đóng gói và giao đến quý khách trong thời gian sớm nhất.', 30, doc.y, { align: 'center', width: 360 });
        }

        doc.end();

    } catch (error) {
        console.error('Export PDF error:', error);
        res.status(500).json({ error: 'Lỗi xuất file PDF hóa đơn' });
    }
};
