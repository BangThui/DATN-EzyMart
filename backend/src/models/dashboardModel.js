const db = require('../config/db');

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// donhang → orders | customer → users (role='customer') | product → products
// tongDoanhThu → total_price | ngayDatHang → order_date
// ───────────────────────────────────────────────────────────────────────────

const DashboardModel = {
    getTotalOrders: (startDate, endDate) => {
        let sql = 'SELECT COUNT(*) as total_orders FROM orders WHERE 1=1';
        const params = [];
        if (startDate && endDate) {
            sql += ' AND DATE(order_date) >= ? AND DATE(order_date) <= ?';
            params.push(startDate, endDate);
        }
        return db.query(sql, params);
    },

    getRevenueByOrder: () => {
        return db.query('SELECT COALESCE(SUM(total_price), 0) as total_revenue FROM orders');
    },

    getTotalCustomers: () => {
        return db.query("SELECT COUNT(*) as total_customers FROM users WHERE role = 1");
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
    },

    // Doanh thu theo ngày (mặc định 30 ngày nếu không có filter)
    getRevenueChart: (startDate, endDate) => {
        let sql = `
            SELECT 
                DATE(order_date) as date,
                COALESCE(SUM(total_price), 0) as revenue,
                COUNT(*) as order_count
            FROM orders
            WHERE order_status != 'cancelled'
        `;
        const params = [];
        if (startDate && endDate) {
            sql += ' AND DATE(order_date) >= ? AND DATE(order_date) <= ?';
            params.push(startDate, endDate);
        } else {
            sql += ' AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        }
        sql += `
            GROUP BY DATE(order_date)
            ORDER BY date ASC
        `;
        return db.query(sql, params);
    },

    // Top 5 sản phẩm bán chạy nhất
    getTopProducts: (startDate, endDate) => {
        let sql = `
            SELECT
                p.product_id,
                p.product_name,
                p.product_image,
                SUM(oi.quantity) as total_sold,
                SUM(oi.quantity * oi.price) as total_revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            JOIN orders o ON oi.order_id = o.order_id
            WHERE 1=1
        `;
        const params = [];
        if (startDate && endDate) {
            sql += ' AND DATE(o.order_date) >= ? AND DATE(o.order_date) <= ?';
            params.push(startDate, endDate);
        }
        sql += `
            GROUP BY p.product_id, p.product_name, p.product_image
            ORDER BY total_sold DESC
            LIMIT 5
        `;
        return db.query(sql, params);
    },

    // 5 đơn hàng mới nhất
    getRecentOrders: (startDate, endDate) => {
        let sql = `
            SELECT 
                o.order_id,
                o.order_date,
                o.total_price,
                o.order_status,
                u.user_name as customer_name,
                u.user_email as customer_email
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];
        if (startDate && endDate) {
            sql += ' AND DATE(o.order_date) >= ? AND DATE(o.order_date) <= ?';
            params.push(startDate, endDate);
        }
        sql += `
            ORDER BY o.order_date DESC
            LIMIT 5
        `;
        return db.query(sql, params);
    },

    getProfitStats: (startDate, endDate) => {
        let sql = `
            SELECT 
                COALESCE(SUM(oi.price * oi.quantity), 0) AS total_revenue,
                COALESCE(SUM(
                    COALESCE((SELECT import_price FROM stock_receipt_details WHERE variant_id = oi.variant_id ORDER BY detail_id DESC LIMIT 1), 0) * oi.quantity
                ), 0) AS total_cost
            FROM orders o
            JOIN order_items oi ON o.order_id = oi.order_id
            WHERE o.order_status = 'completed'
        `;
        const params = [];
        if (startDate && endDate) {
            sql += ' AND DATE(o.order_date) >= ? AND DATE(o.order_date) <= ?';
            params.push(startDate, endDate);
        }
        return db.query(sql, params);
    },

    getTotalImportCost: (startDate, endDate) => {
        let sql = 'SELECT COALESCE(SUM(total_cost), 0) as total_import_cost FROM stock_receipts WHERE 1=1';
        const params = [];
        if (startDate && endDate) {
            sql += ' AND DATE(created_at) >= ? AND DATE(created_at) <= ?';
            params.push(startDate, endDate);
        }
        return db.query(sql, params);
    },

    getTotalItemsSold: () => {
        let sql = `
            SELECT COALESCE(SUM(oi.quantity), 0) as total_items_sold 
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.order_id
            WHERE o.order_status = 'completed'
        `;
        return db.query(sql);
    }
};

module.exports = DashboardModel;
