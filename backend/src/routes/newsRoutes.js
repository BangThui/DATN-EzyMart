const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

// Public routes - không yêu cầu xác thực

// GET /api/news - Danh sách tin tức (status=1, ORDER BY created_at DESC)
router.get('/', newsController.getNews);

// GET /api/news/:id - Chi tiết tin tức theo news_id
router.get('/:id', newsController.getNewsById);

module.exports = router;
