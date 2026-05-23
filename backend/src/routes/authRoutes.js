const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/google-login', authController.googleLogin);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
