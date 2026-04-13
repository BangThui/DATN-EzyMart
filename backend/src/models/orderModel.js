const db = require('../config/db');

const OrderModel = {
    createCustomer: (data) => {
        const { name, user_code, phone, email, address, payments, note } = data;
        return db.query(
            'INSERT INTO customer (customer_name, user_code, customer_phone, customer_email, customer_address, payments, customer_note) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, user_code, phone, email, address, payments || 0, note || '']
        );
    },

    createOrderItem: (data) => {
        const { product_id, variant_id, customer_id, soluong, tongDoanhThu, mahang, ngayDatHang } = data;
        return db.query(
            'INSERT INTO donhang (product_id, variant_id, customer_id, soluong, tongDoanhThu, mahang, ngayDatHang) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [product_id, variant_id, customer_id, soluong, tongDoanhThu, mahang, ngayDatHang]
        );
    },

    createTransaction: (data) => {
        const { customer_id, product_id, variant_id, soluong, mahang, ngayDatHang } = data;
        return db.query(
            'INSERT INTO giaodich (khachhang_id, sanpham_id, variant_id, soluong, magiaodich, ngayThangNam) VALUES (?, ?, ?, ?, ?, ?)',
            [customer_id, product_id, variant_id, soluong, mahang, ngayDatHang]
        );
    },

    getByUserCode: (user_code) => {
        return db.query(
            `SELECT d.*, p.product_name, p.product_image, pv.variant_name, pv.variant_price, pv.variant_discount, c.customer_name, c.customer_phone, c.customer_email
             FROM donhang d
             JOIN product p ON d.product_id = p.product_id
             JOIN product_variants pv ON d.variant_id = pv.variant_id
             LEFT JOIN customer c ON d.customer_id = c.customer_id
             WHERE c.user_code = ?
             ORDER BY d.order_id DESC`,
            [user_code]
        );
    },

    getByMahang: (mahang) => {
        return db.query(
            `SELECT d.*, p.product_name, p.product_image, pv.variant_name, pv.variant_price, pv.variant_discount,
                    c.customer_name, c.customer_phone, c.customer_email, c.customer_address, c.payments
             FROM donhang d
             JOIN product p ON d.product_id = p.product_id
             JOIN product_variants pv ON d.variant_id = pv.variant_id
             LEFT JOIN customer c ON d.customer_id = c.customer_id
             WHERE d.mahang = ?`,
            [mahang]
        );
    },

    getAll: () => {
        return db.query(
            `SELECT d.*, p.product_name, pv.variant_name, pv.variant_price, c.customer_name, c.customer_phone, c.customer_email, c.customer_address
             FROM donhang d
             JOIN product p ON d.product_id = p.product_id
             JOIN product_variants pv ON d.variant_id = pv.variant_id
             LEFT JOIN customer c ON d.customer_id = c.customer_id
             ORDER BY d.order_id DESC`
        );
    },

    updateStatus: (id, tinhtrang) => {
        return db.query('UPDATE donhang SET tinhtrang = ? WHERE donhang_id = ?', [tinhtrang, id]);
    }
};

module.exports = OrderModel;
