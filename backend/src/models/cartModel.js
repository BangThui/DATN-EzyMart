const db = require('../config/db');

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// Bảng join: product → products
// Field: cart.quantity (final) ↔ product_quantity (v2 alias)
// ───────────────────────────────────────────────────────────────────────────

const CartModel = {
    getByUserId: (user_id) => {
        return db.query(
            `SELECT c.cart_id, c.user_id, c.product_id, c.variant_id, c.added_at,
                    c.quantity AS product_quantity,
                    p.product_name, p.product_image,
                    pv.variant_name, pv.variant_price, pv.variant_discount
             FROM cart c
             JOIN products p ON c.product_id = p.product_id
             JOIN product_variants pv ON c.variant_id = pv.variant_id
             WHERE c.user_id = ? ORDER BY c.cart_id ASC`,
            [user_id]
        );
    },

    getAll: () => {
        return db.query(
            `SELECT c.cart_id, c.user_id, c.product_id, c.variant_id, c.added_at,
                    c.quantity AS product_quantity,
                    p.product_name, p.product_image,
                    pv.variant_name, pv.variant_price, pv.variant_discount
             FROM cart c
             JOIN products p ON c.product_id = p.product_id
             JOIN product_variants pv ON c.variant_id = pv.variant_id
             ORDER BY c.cart_id ASC`
        );
    },

    findItem: (product_id, variant_id, user_id) => {
        if (user_id) {
            return db.query(
                'SELECT cart_id, quantity AS product_quantity FROM cart WHERE product_id = ? AND variant_id = ? AND user_id = ?',
                [product_id, variant_id, user_id]
            );
        }
        return db.query(
            'SELECT cart_id, quantity AS product_quantity FROM cart WHERE product_id = ? AND variant_id = ?',
            [product_id, variant_id]
        );
    },

    increaseQuantity: (cart_id, newQty) => {
        return db.query('UPDATE cart SET quantity = ? WHERE cart_id = ?', [newQty, cart_id]);
    },

    addItem: (data, user_id) => {
        const { product_id, variant_id, product_quantity } = data;
        if (user_id) {
            return db.query(
                'INSERT INTO cart (product_id, variant_id, quantity, user_id) VALUES (?, ?, ?, ?)',
                [product_id, variant_id, product_quantity, user_id]
            );
        }
        return db.query(
            'INSERT INTO cart (product_id, variant_id, quantity) VALUES (?, ?, ?)',
            [product_id, variant_id, product_quantity]
        );
    },

    updateQuantity: (cart_id, quantity) => {
        return db.query('UPDATE cart SET quantity = ? WHERE cart_id = ?', [quantity, cart_id]);
    },

    deleteItem: (cart_id) => {
        return db.query('DELETE FROM cart WHERE cart_id = ?', [cart_id]);
    },

    clearByUserId: (user_id) => {
        return db.query('DELETE FROM cart WHERE user_id = ?', [user_id]);
    },

    clearAll: () => {
        return db.query('DELETE FROM cart');
    }
};

module.exports = CartModel;
