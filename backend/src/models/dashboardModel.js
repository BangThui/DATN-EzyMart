const db = require('../config/db');

const DashboardModel = {
    getTotalOrders: () => {
        return db.query('SELECT COUNT(DISTINCT mahang) as total_orders FROM donhang');
    },

    getRevenueByOrder: () => {
        return db.query('SELECT COALESCE(SUM(tongDoanhThu), 0) as total_revenue FROM donhang GROUP BY mahang');
    },

    getTotalCustomers: () => {
        return db.query('SELECT COUNT(*) as total_customers FROM customer');
    },

    getMonthStats: () => {
        return db.query(`
            SELECT 
                COALESCE(SUM(tongDoanhThu), 0) AS month_revenue,
                COUNT(*) AS month_orders
            FROM donhang
            WHERE MONTH(ngayDatHang) = MONTH(CURDATE())
              AND YEAR(ngayDatHang) = YEAR(CURDATE())
        `);
    },

    getTotalProducts: () => {
        return db.query('SELECT COUNT(*) as total_products FROM product');
    }
};

module.exports = DashboardModel;
