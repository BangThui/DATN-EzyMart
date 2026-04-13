const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Public (user)
router.post('/', orderController.createOrder);
router.get('/user/:user_code', orderController.getOrdersByUserCode);
router.get('/detail/:mahang', orderController.getOrderByMahang);

// Admin
router.get('/', authMiddleware, adminMiddleware, orderController.getAllOrders);
router.put('/:id/status', authMiddleware, adminMiddleware, orderController.updateOrderStatus);

module.exports = router;
