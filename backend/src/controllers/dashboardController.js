const PDFDocument = require('pdfkit');
const path = require('path');
const DashboardModel = require('../models/dashboardModel');
const db = require('../config/db');



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
        
        // Thống kê mới
        const [importRows] = await DashboardModel.getTotalImportCost(startDate, endDate);
        const [itemsSoldRows] = await DashboardModel.getTotalItemsSold();

        res.json({
            total_orders: orderRows[0].total_orders,
            total_revenue,
            total_profit,
            total_customers: customerRows[0].total_customers,
            month_revenue: monthRows[0].month_revenue || 0,
            month_orders: monthRows[0].month_orders || 0,
            total_products: productRows[0].total_products,
            total_import_cost: importRows[0].total_import_cost || 0,
            total_items_sold: itemsSoldRows[0].total_items_sold || 0
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

// Xuất báo cáo quản trị PDF
exports.exportManagementReportPDF = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // 1. Lấy dữ liệu thống kê
        const [orderRows] = await DashboardModel.getTotalOrders(startDate, endDate);
        const [profitRows] = await DashboardModel.getProfitStats(startDate, endDate);
        const [topProducts] = await DashboardModel.getTopProducts(startDate, endDate);
        const [customerRows] = await DashboardModel.getTotalCustomers(); // Lấy tổng khách do DB chưa hỗ trợ created_at cho user

        const totalOrders = orderRows[0]?.total_orders || 0;
        const totalRevenue = parseFloat(profitRows[0]?.total_revenue) || 0;
        const totalCost = parseFloat(profitRows[0]?.total_cost) || 0;
        const totalProfit = totalRevenue - totalCost;
        
        const totalCustomers = customerRows[0]?.total_customers || 0;
        const aov = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

        // Truy vấn phân rã đơn hàng (pickup / delivery)
        let shippingSql = 'SELECT shipping_method, COUNT(*) as count FROM orders WHERE 1=1';
        const shippingParams = [];
        if (startDate && endDate) {
            shippingSql += ' AND DATE(order_date) >= ? AND DATE(order_date) <= ?';
            shippingParams.push(startDate, endDate);
        }
        shippingSql += ' GROUP BY shipping_method';
        
        const [shippingRows] = await db.query(shippingSql, shippingParams);
        let pickupCount = 0;
        let deliveryCount = 0;
        shippingRows.forEach(row => {
            if (row.shipping_method === 'pickup') pickupCount = row.count;
            if (row.shipping_method === 'delivery') deliveryCount = row.count;
        });

        // 2. Khởi tạo file PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const fontPathRegular = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="BaoCaoKinhDoanh_${startDate || 'all'}.pdf"`);
        doc.pipe(res);

        // 3. Header
        const leftWidth = 200;
        doc.font(fontPathBold).fontSize(10);
        doc.text('CỬA HÀNG TIỆN LỢI EZYMART', 50, 50, { align: 'center', width: leftWidth });
        doc.text('Hotline: 0349484515', 50, 65, { align: 'center', width: leftWidth });

        const rightWidth = 260;
        const rightX = 545 - rightWidth;
        doc.text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', rightX, 50, { align: 'center', width: rightWidth });
        doc.font(fontPathRegular).text('Độc lập - Tự do - Hạnh phúc', rightX, 65, { align: 'center', width: rightWidth });
        
        const lineLength = 140;
        const lineStartX = rightX + (rightWidth - lineLength) / 2;
        doc.moveTo(lineStartX, 80).lineTo(lineStartX + lineLength, 80).stroke(); // Line under motto

        doc.moveDown(4);

        // Title
        doc.font(fontPathBold).fontSize(16).text('BÁO CÁO KẾT QUẢ KINH DOANH CỬA HÀNG', 50, doc.y, { align: 'center', width: 495 });
        doc.moveDown(0.5);
        
        const formatVN = (dStr) => {
            if (!dStr) return '';
            const parts = dStr.split('-');
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
        };
        const periodText = (startDate && endDate) ? `Từ ngày ${formatVN(startDate)} đến ngày ${formatVN(endDate)}` : 'Tất cả thời gian';
        doc.font(fontPathRegular).fontSize(12).text(`Kỳ báo cáo: ${periodText}`, 50, doc.y, { align: 'center', width: 495 });
        doc.moveDown(2);

        // Phần 1: Tóm tắt chỉ số chính
        doc.font(fontPathBold).fontSize(13).fillColor('#000000').text('I. TÓM TẮT CHỈ SỐ CHÍNH', 50, doc.y);
        doc.moveDown(1);
        
        let currentY = doc.y;
        const col1W = 250;
        const col2W = 245;

        const drawExcelRow = (y, h, title, value, subText = null) => {
            doc.lineWidth(0.5);
            
            // Col 1 (Tiêu đề)
            doc.rect(50, y, col1W, h).fillAndStroke('#F5F5F5', '#CCCCCC');
            // Col 2 (Số liệu)
            doc.rect(50 + col1W, y, col2W, h).fillAndStroke('#FFFFFF', '#CCCCCC');

            // Text Col 1
            doc.fillColor('#000000').font(fontPathBold).fontSize(11).text(title, 60, y + 8, { width: col1W - 20 });
            if (subText) {
                doc.fillColor('#555555').font(fontPathRegular).fontSize(9).text(subText, 60, y + 24, { width: col1W - 20 });
            }

            // Text Col 2 (Căn phải, căn giữa theo chiều dọc)
            const textY = y + (h / 2) - 6;
            doc.fillColor('#000000').font(fontPathBold).fontSize(11).text(value, 50 + col1W + 10, textY, { width: col2W - 20, align: 'right' });
            
            return y + h;
        };

        currentY = drawExcelRow(currentY, 32, 'Tổng doanh thu', `${totalRevenue.toLocaleString('vi-VN')} VNĐ`);
        currentY = drawExcelRow(currentY, 32, 'Tổng lợi nhuận thực tế', `${totalProfit.toLocaleString('vi-VN')} VNĐ`);
        currentY = drawExcelRow(currentY, 45, 'Tổng số đơn hàng phát sinh', `${totalOrders} đơn`, `(Nhận tại quầy: ${pickupCount} | Giao hàng: ${deliveryCount})`);
        currentY = drawExcelRow(currentY, 32, 'Tổng số khách hàng mới', `${totalCustomers} người`);
        currentY = drawExcelRow(currentY, 32, 'Giá trị trung bình đơn (AOV)', `${Math.round(aov).toLocaleString('vi-VN')} VNĐ/đơn`);

        doc.y = currentY + 25; // Di chuyển cursor xuống dưới bảng
        doc.fillColor('#000000'); // Reset màu chữ cho các phần sau

        // Phần 2: Chi tiết hiệu suất sản phẩm
        doc.font(fontPathBold).fontSize(13).text('II. CHI TIẾT HIỆU SUẤT SẢN PHẨM (TOP BÁN CHẠY)', 50, doc.y, { align: 'left', width: 495 });
        doc.moveDown(1);

        // Vẽ bảng
        const tableTop = doc.y;
        const colX = [50, 90, 260, 350, 460]; // Tọa độ X cho các cột
        
        doc.font(fontPathBold).fontSize(10);
        doc.text('STT', colX[0], tableTop, { align: 'left' });
        doc.text('Tên sản phẩm', colX[1], tableTop, { align: 'left', width: 160 });
        doc.text('Số lượng bán', colX[2], tableTop, { width: 80, align: 'right' });
        doc.text('Doanh thu (VNĐ)', colX[3], tableTop, { width: 100, align: 'right' });
        doc.text('Tỷ trọng (%)', colX[4], tableTop, { width: 85, align: 'right' });
        
        doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

        currentY = tableTop + 25;
        doc.font(fontPathRegular).fontSize(10);

        topProducts.forEach((prod, index) => {
            const rowRevenue = parseFloat(prod.total_revenue) || 0;
            const percentage = totalRevenue > 0 ? ((rowRevenue / totalRevenue) * 100).toFixed(2) : 0;

            doc.text(index + 1, colX[0], currentY, { align: 'left' });
            doc.text(prod.product_name, colX[1], currentY, { width: 160, align: 'left' });
            doc.text(prod.total_sold, colX[2], currentY, { width: 80, align: 'right' });
            doc.text(rowRevenue.toLocaleString('vi-VN'), colX[3], currentY, { width: 100, align: 'right' });
            doc.text(`${percentage}%`, colX[4], currentY, { width: 85, align: 'right' });

            const textHeight = doc.heightOfString(prod.product_name, { width: 160 });
            currentY += Math.max(textHeight, 15) + 10;
        });

        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        doc.moveDown(4);

        // Phần 3: Chữ ký xác nhận
        currentY = doc.y + 20;
        doc.font(fontPathBold).fontSize(11).text('Người lập báo cáo', 350, currentY, { align: 'center', width: 150 });
        doc.font(fontPathRegular).fontSize(10).text('(Ký và ghi rõ họ tên)', 350, currentY + 15, { align: 'center', width: 150 });

        doc.end();

    } catch (error) {
        console.error('Export Report PDF error:', error);
        res.status(500).json({ error: 'Lỗi xuất file PDF báo cáo' });
    }
};
