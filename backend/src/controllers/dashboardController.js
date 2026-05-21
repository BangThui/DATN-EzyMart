const DashboardModel = require('../models/dashboardModel');

// Thống kê tổng quan cho dashboard admin
exports.getStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const [orderRows] = await DashboardModel.getTotalOrders(startDate, endDate);
        
        // Tính doanh thu và lợi nhuận từ các đơn hàng thành công theo ngày
        const [profitRows] = await DashboardModel.getProfitStats(startDate, endDate);
        const total_revenue = parseFloat(profitRows[0].total_revenue) || 0;
        const total_cost = parseFloat(profitRows[0].total_cost) || 0;
        const total_profit = total_revenue - total_cost;

        // Các thống kê tổng thể không bị ảnh hưởng bởi bộ lọc ngày
        const [customerRows] = await DashboardModel.getTotalCustomers();
        const [monthRows] = await DashboardModel.getMonthStats();
        const [productRows] = await DashboardModel.getTotalProducts();

        res.json({
            total_orders: orderRows[0].total_orders,
            total_revenue,
            total_profit,
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

// Dữ liệu biểu đồ doanh thu
exports.getCharts = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const [rows] = await DashboardModel.getRevenueChart(startDate, endDate);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy dữ liệu biểu đồ' });
    }
};

// Top 5 sản phẩm bán chạy nhất
exports.getTopProducts = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const [rows] = await DashboardModel.getTopProducts(startDate, endDate);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy top sản phẩm' });
    }
};

// 5 đơn hàng mới nhất
exports.getRecentOrders = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const [rows] = await DashboardModel.getRecentOrders(startDate, endDate);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy đơn hàng mới nhất' });
    }
};
