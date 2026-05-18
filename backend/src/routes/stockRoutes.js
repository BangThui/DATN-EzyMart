const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Tất cả đều yêu cầu đăng nhập + quyền admin
router.get('/', authMiddleware, adminMiddleware, stockController.getReceipts);
router.post('/import', authMiddleware, adminMiddleware, stockController.importStock);
router.post('/bulk-import', authMiddleware, adminMiddleware, stockController.bulkImportStock);
router.get('/:id', authMiddleware, adminMiddleware, stockController.getReceiptById);

module.exports = router;
