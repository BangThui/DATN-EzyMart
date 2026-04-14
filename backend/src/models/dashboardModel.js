const db = require('../config/db');

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// donhang → orders | customer → users (role='customer') | product → products
// tongDoanhThu → total_price | ngayDatHang → order_date
// ───────────────────────────────────────────────────────────────────────────

const DashboardModel = {
    getTotalOrders: () => {
        return db.query('SELECT COUNT(*) as total_orders FROM orders');
    },

    getRevenueByOrder: () => {
        return db.query('SELECT COALESCE(SUM(total_price), 0) as total_revenue FROM orders');
    },

    getTotalCustomers: () => {
        return db.query("SELECT COUNT(*) as total_customers FROM users WHERE role = 'customer'");
    },

    getMonthStats: () => {
        return db.query(`
            SELECT
                COALESCE(SUM(total_price), 0) AS month_revenue,
                COUNT(*) AS month_orders
            FROM orders
            WHERE MONTH(order_date) = MONTH(CURDATE())
              AND YEAR(order_date) = YEAR(CURDATE())
        `);
    },

    getTotalProducts: () => {
        return db.query('SELECT COUNT(*) as total_products FROM products');
    }
};

module.exports = DashboardModel;
