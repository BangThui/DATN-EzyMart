const OrderModel = require('../models/orderModel');
const CartModel = require('../models/cartModel');
const { getIO } = require('../socket');

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// createOrder: Bỏ customer/giaodich, dùng orders + order_items
// getOrdersByUserCode → getOrdersByUserId (dùng user_id)
// mahang = order_id
// ───────────────────────────────────────────────────────────────────────────

// Tạo đơn hàng
exports.createOrder = async (req, res) => {
    try {
        const { name, phone, email, address, payments, note, cart_items, user_id } = req.body;

        if (!cart_items || cart_items.length === 0) {
            return res.status(400).json({ error: 'Giỏ hàng trống' });
        }

        // Tính tổng tiền
        const total_price = cart_items.reduce((sum, item) => {
            const price = (item.variant_discount && Number(item.variant_discount) > 0 && Number(item.variant_discount) < Number(item.variant_price))
                ? item.variant_discount
                : item.variant_price;
            return sum + Number(price) * (item.product_quantity || item.quantity || 1);
        }, 0);

        // Tạo đơn hàng trong orders + order_items
        const order_id = await OrderModel.createOrder({ user_id: user_id || null, cart_items, total_price, note, payments });

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
