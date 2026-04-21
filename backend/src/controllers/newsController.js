const NewsModel = require('../models/newsModel');

/**
 * GET /api/news
 * Lấy danh sách tin tức đang hoạt động (status = 1), mới nhất trước
 */
exports.getNews = async (req, res) => {
  try {
    const data = await NewsModel.getAll();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[newsController] getNews error:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tin tức' });
  }
};

/**
 * GET /api/news/:id
 * Lấy chi tiết tin tức theo news_id
 */
exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await NewsModel.getById(id);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[newsController] getNewsById error:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết tin tức' });
  }
};
