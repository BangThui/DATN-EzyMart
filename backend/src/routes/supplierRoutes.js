const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// Tất cả đều yêu cầu đăng nhập + quyền admin
router.get('/', authMiddleware, adminMiddleware, supplierController.getSuppliers);
router.post('/', authMiddleware, adminMiddleware, supplierController.createSupplier);
router.put('/:id', authMiddleware, adminMiddleware, supplierController.updateSupplier);
router.delete('/:id', authMiddleware, adminMiddleware, supplierController.deleteSupplier);

module.exports = router;
