const CartModel = require('../models/cartModel');
const ProductModel = require('../models/productModel');

// Lấy giỏ hàng theo user_id (dùng query param để backward compat)
exports.getCart = async (req, res) => {
    try {
        const user_id = req.query.user_id || null;
        let rows;
        if (user_id) {
            [rows] = await CartModel.getByUserId(user_id);
        } else {
            [rows] = await CartModel.getAll();
        }
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy giỏ hàng' });
    }
};

// Thêm sản phẩm vào giỏ hàng
exports.addToCart = async (req, res) => {
    try {
        const { product_id, variant_id, quantity = 1, user_id } = req.body;
        if (!product_id || !variant_id) return res.status(400).json({ error: 'product_id và variant_id là bắt buộc' });

        // Lấy thông tin sản phẩm
        const [productRows] = await ProductModel.getById(product_id);
        if (productRows.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        // Kiểm tra xem sản phẩm đã có trong giỏ chưa
        const [existing] = await CartModel.findItem(product_id, variant_id, user_id);

        if (existing.length > 0) {
            // Cộng thêm số lượng
            const newQty = existing[0].product_quantity + parseInt(quantity);
            await CartModel.increaseQuantity(existing[0].cart_id, newQty);
        } else {
            // Thêm mới
            await CartModel.addItem({
                product_id,
                variant_id,
                product_quantity: quantity
            }, user_id);
        }

        res.status(201).json({ message: 'Đã thêm vào giỏ hàng' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi thêm vào giỏ hàng' });
    }
};

// Cập nhật số lượng sản phẩm trong giỏ
exports.updateCartItem = async (req, res) => {
    try {
        const { cart_id } = req.params;
        const { quantity } = req.body;

        if (parseInt(quantity) <= 0) {
            await CartModel.deleteItem(cart_id);
            return res.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
        }

        await CartModel.updateQuantity(cart_id, quantity);
        res.json({ message: 'Cập nhật giỏ hàng thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật giỏ hàng' });
    }
};

// Xóa 1 sản phẩm khỏi giỏ
exports.removeFromCart = async (req, res) => {
    try {
        const { cart_id } = req.params;
        await CartModel.deleteItem(cart_id);
        res.json({ message: 'Đã xóa khỏi giỏ hàng' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa khỏi giỏ hàng' });
    }
};

// Xóa toàn bộ giỏ hàng (sau khi đặt hàng)
exports.clearCart = async (req, res) => {
    try {
        const { user_id } = req.body;
        if (user_id) {
            await CartModel.clearByUserId(user_id);
        } else {
            await CartModel.clearAll();
        }
        res.json({ message: 'Đã xóa toàn bộ giỏ hàng' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa giỏ hàng' });
    }
};
