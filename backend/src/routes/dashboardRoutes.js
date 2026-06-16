const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

router.get('/stats',          authMiddleware, adminMiddleware, dashboardController.getStats);
router.get('/charts',         authMiddleware, adminMiddleware, dashboardController.getCharts);
router.get('/top-products',   authMiddleware, adminMiddleware, dashboardController.getTopProducts);
router.get('/recent-orders',  authMiddleware, adminMiddleware, dashboardController.getRecentOrders);
router.get('/export-report-pdf', authMiddleware, adminMiddleware, dashboardController.exportManagementReportPDF);

module.exports = router;
