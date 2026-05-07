const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public routes
router.get('/', brandController.getBrands);
router.get('/:id', brandController.getBrandById);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, upload.single('brand_logo'), brandController.createBrand);
router.put('/:id', authMiddleware, adminMiddleware, upload.single('brand_logo'), brandController.updateBrand);
router.delete('/:id', authMiddleware, adminMiddleware, brandController.deleteBrand);

module.exports = router;
