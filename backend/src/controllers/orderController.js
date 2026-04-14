const OrderModel = require('../models/orderModel');
const CartModel = require('../models/cartModel');

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
        const order_id = await OrderModel.createOrder({ user_id: user_id || null, cart_items, total_price });

        // Xoá giỏ hàng sau khi đặt thành công
        if (user_id) {
            await CartModel.clearByUserId(user_id);
        }

        res.status(201).json({
            message: 'Đặt hàng thành công',
            mahang: order_id,       // order_id dùng làm mahang cho FE
            order_id,
            totalPayment: total_price
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Đặt hàng thất bại' });
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

// [ADMIN] Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
    try {
        const [rows] = await OrderModel.getAll();
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
        await OrderModel.updateStatus(id, statusValue);
        res.json({ message: 'Cập nhật trạng thái đơn hàng thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật trạng thái đơn hàng' });
    }
};
