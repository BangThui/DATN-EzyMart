const DashboardModel = require('../models/dashboardModel');

// Thống kê cho dashboard admin
exports.getStats = async (req, res) => {
    try {
        const [orderRows] = await DashboardModel.getTotalOrders();
        const [revenueRows] = await DashboardModel.getRevenueByOrder();
        const total_revenue = revenueRows.reduce((sum, r) => sum + parseFloat(r.total_revenue), 0);
        const [customerRows] = await DashboardModel.getTotalCustomers();
        const [monthRows] = await DashboardModel.getMonthStats();
        const [productRows] = await DashboardModel.getTotalProducts();

        res.json({
            total_orders: orderRows[0].total_orders,
            total_revenue,
            total_customers: customerRows[0].total_customers,
            month_revenue: monthRows[0].month_revenue || 0,
            month_orders: monthRows[0].month_orders || 0,
            total_products: productRows[0].total_products
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy thống kê' });
    }
};
