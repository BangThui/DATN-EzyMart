const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', productController.getProducts);
router.get('/filter', productController.filterProducts);
router.get('/similar', productController.getSimilarProducts);
router.get('/hot', productController.getHotProducts);
router.get('/:id', productController.getProductById);

// Admin routes (require auth + admin role)
router.get('/deleted/trash', authMiddleware, adminMiddleware, productController.getDeletedProducts);
router.post('/get-details-by-variants', authMiddleware, adminMiddleware, productController.getDetailsByVariants);

// Dùng upload.array('images', 10) để cho phép upload tối đa 10 ảnh
router.post('/', authMiddleware, adminMiddleware, upload.array('images', 10), productController.createProduct);
router.put('/:id', authMiddleware, adminMiddleware, upload.array('images', 10), productController.updateProduct);

// Xóa 1 ảnh trong product_images
router.delete('/:id/images/:imageId', authMiddleware, adminMiddleware, productController.deleteProductImage);

router.patch('/:id/soft-delete', authMiddleware, adminMiddleware, productController.softDeleteProduct);
router.patch('/:id/restore', authMiddleware, adminMiddleware, productController.restoreProduct);
router.patch('/:id/status', authMiddleware, adminMiddleware, productController.updateProductStatus);
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

module.exports = router;
