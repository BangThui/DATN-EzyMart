const db = require('../config/db');

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// donhang + customer + giaodich → orders + order_items + users
//
// Field aliasing (output phải giống v2 cho FE):
//   o.order_id          → mahang
//   o.total_price       → tongDoanhThu
//   o.order_date        → ngayDatHang
//   order_status ENUM   → trangThai (pending=0, confirmed=1, shipping=2, completed=3, cancelled=4)
//   oi.quantity         → soluong
//   u.user_name         → customer_name
//   u.user_phone        → customer_phone
//   u.user_email        → customer_email
// ───────────────────────────────────────────────────────────────────────────

// Map order_status ENUM → số (giống trangThai v2)
const STATUS_MAP = {
    pending:   0,
    confirmed: 1,
    shipping:  2,
    completed: 3,
    cancelled: 4
};
const STATUS_REVERSE = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

// SQL CASE để alias trangThai dạng số
const STATUS_CASE = `
    CASE o.order_status
        WHEN 'pending'   THEN 0
        WHEN 'confirmed' THEN 1
        WHEN 'shipping'  THEN 2
        WHEN 'completed' THEN 3
        WHEN 'cancelled' THEN 4
        ELSE 0
    END AS trangThai
`;

const OrderModel = {
    /**
     * Tạo đơn hàng: INSERT orders + N order_items
     * Trả về { order_id } dùng làm mahang
     */
    createOrder: async (data) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const { user_id, cart_items, total_price } = data;

            // Tạo record orders
            const [orderResult] = await connection.query(
                'INSERT INTO orders (user_id, total_price, order_status) VALUES (?, ?, ?)',
                [user_id || null, total_price, 'pending']
            );
            const order_id = orderResult.insertId;

            // Tạo từng order_item
            for (const item of cart_items) {
                const price = (item.variant_discount && Number(item.variant_discount) > 0 && Number(item.variant_discount) < Number(item.variant_price))
                    ? item.variant_discount
                    : item.variant_price;
                await connection.query(
                    'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
                    [order_id, item.product_id, item.variant_id, item.product_quantity || item.quantity, price]
                );
            }

            await connection.commit();
            return order_id;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Lấy đơn hàng theo user_id (thay thế getByUserCode)
     */
    getByUserId: (user_id) => {
        return db.query(
            `SELECT
                o.order_id AS mahang,
                o.total_price AS tongDoanhThu,
                o.order_date AS ngayDatHang,
                ${STATUS_CASE},
                o.order_status,
                oi.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.quantity AS soluong,
                oi.price AS variant_price,
                p.product_name,
                p.product_image,
                pv.variant_name,
                pv.variant_discount,
                u.user_name AS customer_name,
                u.user_phone AS customer_phone,
                u.user_email AS customer_email
             FROM orders o
             JOIN order_items oi ON o.order_id = oi.order_id
             JOIN products p ON oi.product_id = p.product_id
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN users u ON o.user_id = u.user_id
             WHERE o.user_id = ?
             ORDER BY o.order_id DESC`,
            [user_id]
        );
    },

    /**
     * Lấy chi tiết 1 đơn hàng theo mahang (order_id)
     */
    getByMahang: (mahang) => {
        return db.query(
            `SELECT
                o.order_id AS mahang,
                o.total_price AS tongDoanhThu,
                o.order_date AS ngayDatHang,
                ${STATUS_CASE},
                o.order_status,
                oi.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.quantity AS soluong,
                oi.price AS variant_price,
                p.product_name,
                p.product_image,
                pv.variant_name,
                pv.variant_discount,
                u.user_name AS customer_name,
                u.user_phone AS customer_phone,
                u.user_email AS customer_email,
                u.user_address AS customer_address
             FROM orders o
             JOIN order_items oi ON o.order_id = oi.order_id
             JOIN products p ON oi.product_id = p.product_id
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN users u ON o.user_id = u.user_id
             WHERE o.order_id = ?`,
            [mahang]
        );
    },

    /**
     * [ADMIN] Lấy tất cả đơn hàng
     */
    getAll: () => {
        return db.query(
            `SELECT
                o.order_id AS mahang,
                o.total_price AS tongDoanhThu,
                o.order_date AS ngayDatHang,
                ${STATUS_CASE},
                o.order_status,
                o.user_id,
                oi.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.quantity AS soluong,
                oi.price AS variant_price,
                p.product_name,
                pv.variant_name,
                u.user_name AS customer_name,
                u.user_phone AS customer_phone,
                u.user_email AS customer_email,
                u.user_address AS customer_address
             FROM orders o
             JOIN order_items oi ON o.order_id = oi.order_id
             JOIN products p ON oi.product_id = p.product_id
             JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN users u ON o.user_id = u.user_id
             ORDER BY o.order_id DESC`
        );
    },

    /**
     * Cập nhật trạng thái đơn hàng
     * Nhận trangThai (số 0-4) hoặc chuỗi ENUM
     */
    updateStatus: (order_id, trangThai) => {
        // Chấp nhận cả số (0-4) lẫn chuỗi enum
        const statusStr = typeof trangThai === 'number'
            ? (STATUS_REVERSE[trangThai] || 'pending')
            : trangThai;
        return db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', [statusStr, order_id]);
    }
};

module.exports = OrderModel;
