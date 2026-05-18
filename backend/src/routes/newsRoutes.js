const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');

// ─── Public Routes ─────────────────────────────────────────────────────────────
// GET /api/news         – Danh sách (admin: hỗ trợ ?search=&status=)
router.get('/', newsController.getNews);

// GET /api/news/:id     – Chi tiết một bài viết
router.get('/:id', newsController.getNewsById);

// ─── Admin Routes (thêm/sửa/xóa) ──────────────────────────────────────────────
// POST /api/news        – Tạo bài viết mới (kèm upload ảnh)
router.post('/', newsController.uploadNewsImage, newsController.createNews);

// PUT /api/news/:id     – Cập nhật bài viết (kèm xử lý đổi ảnh nếu có)
router.put('/:id', newsController.uploadNewsImage, newsController.updateNews);

// PATCH /api/news/:id/status – Bật/tắt trạng thái nhanh
router.patch('/:id/status', newsController.updateNewsStatus);

// DELETE /api/news/:id  – Xóa bài viết
router.delete('/:id', newsController.deleteNews);

module.exports = router;
