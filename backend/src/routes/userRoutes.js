const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

// User routes
router.get('/:id', authMiddleware, userController.getUserById);
router.put('/:id', authMiddleware, userController.updateProfile);
router.put('/:id/password', authMiddleware, userController.changePassword);

// Admin routes
router.get('/', authMiddleware, adminMiddleware, userController.getAllUsers);
router.post('/admin', authMiddleware, adminMiddleware, userController.createUserByAdmin);
router.put('/admin/:id', authMiddleware, adminMiddleware, userController.updateUserByAdmin);
router.delete('/admin/:id', authMiddleware, adminMiddleware, userController.deleteUser);
router.get('/admin/customers', authMiddleware, adminMiddleware, userController.getAllCustomers);

module.exports = router;
