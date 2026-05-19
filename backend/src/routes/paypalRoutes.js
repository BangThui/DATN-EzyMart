const express = require('express');
const router = express.Router();
const paypalController = require('../controllers/paypalController');

// Route tạo giao dịch PayPal Order
router.post('/create-order', paypalController.createOrder);

// Route xác nhận và hoàn tất thanh toán (capture)
router.post('/capture-order', paypalController.captureOrder);

module.exports = router;
