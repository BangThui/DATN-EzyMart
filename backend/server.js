const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);

// ─── Khởi tạo Socket.io ─────────────────────────────────────────────────────
const socketModule = require('./src/socket');
socketModule.init(httpServer);
// ────────────────────────────────────────────────────────────────────────────

// ─── Khởi tạo Cron Jobs ──────────────────────────────────────────────────────
const cronService = require('./src/services/cronService');
cronService.initCronJobs();
// ────────────────────────────────────────────────────────────────────────────

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Phục vụ ảnh từ thư mục images gốc (backward compat)
app.use('/images', express.static(path.join(__dirname, '../images')));

// Routes
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const newsRoutes = require('./src/routes/newsRoutes');
const brandRoutes = require('./src/routes/brandRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const paypalRoutes = require('./src/routes/paypalRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes');
const chatbotRoutes = require('./src/routes/chatbotRoutes');
const settingRoutes = require('./src/routes/settingRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/payment/paypal', paypalRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/settings', settingRoutes);

// // Endpoint xem dữ liệu comboCache
// const comboCacheObj = require('./src/utils/comboCache');
// app.get('/api/debug-cache', (req, res) => {
//     const currentHour = new Date().getHours();
//     res.json({
//         timeSlot: comboCacheObj.getTimeSlotIdentifier(currentHour),
//         currentHour: currentHour,
//         cacheData: comboCacheObj.getCache(currentHour)
//     });
// });

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'EzyMart Backend API đang chạy ✅', version: '2.0.0' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route không tồn tại' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Lỗi server' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
    console.log(`🔌 Socket.io đã kích hoạt`);
});

// Xử lý lỗi port bị chiếm — hiển thị thông báo rõ ràng thay vì crash
httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ [SERVER] Port ${PORT} đang bị chiếm bởi tiến trình khác.`);
        console.error(`   👉 Chạy lệnh này để giải phóng port: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT} -State Listen).OwningProcess -Force`);
        console.error(`   Hoặc đổi PORT trong file .env\n`);
        process.exit(1);
    } else {
        console.error('❌ [SERVER] Lỗi không xác định:', err);
        process.exit(1);
    }
});
