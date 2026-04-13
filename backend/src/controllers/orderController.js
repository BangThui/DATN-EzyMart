const OrderModel = require('../models/orderModel');
const UserModel = require('../models/userModel');
const CartModel = require('../models/cartModel');

// Tạo đơn hàng (checkout flow từ PHP thanhtoan.php)
exports.createOrder = async (req, res) => {
    try {
        const { name, phone, email, address, payments, note, cart_items, user_id } = req.body;

        if (!cart_items || cart_items.length === 0) {
            return res.status(400).json({ error: 'Giỏ hàng trống' });
        }

        // Tạo mã đơn hàng và mã khách hàng
        const mahang = Math.floor(1000 + Math.random() * 9000);
        const user_code = Math.floor(1000 + Math.random() * 9000);
        const ngayDatHang = new Date().toISOString().slice(0, 10);

        // Tính tổng tiền
        const totalPayment = cart_items.reduce((sum, item) => {
             const price = (item.variant_discount && Number(item.variant_discount) > 0 && Number(item.variant_discount) < Number(item.variant_price)) ? item.variant_discount : item.variant_price;
             return sum + Number(price) * item.product_quantity;
        }, 0);

        // Thêm vào bảng customer
        const [customerResult] = await OrderModel.createCustomer({ name, user_code, phone, email, address, payments, note });
        const customer_id = customerResult.insertId;

        // Thêm từng item vào bảng donhang và giaodich
        for (const item of cart_items) {
            await OrderModel.createOrderItem({ product_id: item.product_id, variant_id: item.variant_id, customer_id, soluong: item.product_quantity, tongDoanhThu: totalPayment, mahang, ngayDatHang });
            await OrderModel.createTransaction({ customer_id, product_id: item.product_id, variant_id: item.variant_id, soluong: item.product_quantity, mahang, ngayDatHang });
        }

        // Cập nhật user_code trong quanli_user nếu có user đang đăng nhập
        if (user_id) {
            await UserModel.updateUserCode(user_id, user_code);
            await CartModel.clearByUserId(user_id);
        } else {
            await CartModel.clearAll();
        }

        res.status(201).json({
            message: 'Đặt hàng thành công',
            mahang,
            customer_id,
            totalPayment
        });
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Đặt hàng thất bại' });
    }
};

// Lấy đơn hàng theo user_code (đã mua)
exports.getOrdersByUserCode = async (req, res) => {
    try {
        const { user_code } = req.params;
        const [rows] = await OrderModel.getByUserCode(user_code);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy đơn hàng' });
    }
};

// Lấy chi tiết đơn hàng theo mã hàng
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
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { tinhtrang } = req.body;
        await OrderModel.updateStatus(id, tinhtrang);
        res.json({ message: 'Cập nhật trạng thái đơn hàng thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật trạng thái đơn hàng' });
    }
};
