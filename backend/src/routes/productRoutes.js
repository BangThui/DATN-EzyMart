const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', productController.getProducts);
router.get('/similar', productController.getSimilarProducts);
router.get('/:id', productController.getProductById);

// Admin routes (require auth + admin role)
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), productController.createProduct);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), productController.updateProduct);
router.patch('/:id/status', authMiddleware, adminMiddleware, productController.updateProductStatus);
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

module.exports = router;
