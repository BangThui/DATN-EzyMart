const NewsModel = require('../models/newsModel');
const upload = require('../middleware/uploadMiddleware');

// ─── Middleware upload ảnh bài viết (single field "image") ───────────────────
const uploadNewsImage = upload.single('image');

// ─── GET /api/news (Admin) – Lấy tất cả, hỗ trợ lọc theo title & status ─────
exports.getNews = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filters = {};
    if (search) filters.search = search;
    if (status !== undefined && status !== '') filters.status = status;

    const data = await NewsModel.getAllNews(filters);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[newsController] getNews error:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách tin tức' });
  }
};

// ─── GET /api/news/:id ────────────────────────────────────────────────────────
exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await NewsModel.getNewsById(id);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[newsController] getNewsById error:', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết tin tức' });
  }
};

// ─── POST /api/news (Admin) – Tạo bài viết mới ───────────────────────────────
exports.createNews = async (req, res) => {
  try {
    const { title, description, content, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề bài viết là bắt buộc' });
    }

    // req.file là ảnh tải lên qua Cloudinary (multer-storage-cloudinary trả về .path = URL)
    const image = req.file ? req.file.path : null;

    const result = await NewsModel.createNews({ title, description, content, image, status });

    res.status(201).json({
      success: true,
      message: 'Tạo bài viết thành công',
      newsId: result.insertId,
    });
  } catch (err) {
    console.error('[newsController] createNews error:', err);
    res.status(500).json({ success: false, message: 'Lỗi tạo bài viết' });
  }
};

// ─── PUT /api/news/:id (Admin) – Cập nhật bài viết ───────────────────────────
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề bài viết là bắt buộc' });
    }

    // Lấy ảnh cũ nếu không upload ảnh mới
    const existing = await NewsModel.existsById(id);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    // Lấy thông tin đầy đủ để giữ lại ảnh cũ
    const existingFull = await NewsModel.getNewsById(id);
    const oldImage = existingFull[0]?.image || null;

    // Nếu có file mới upload thì dùng URL mới, không thì giữ nguyên ảnh cũ
    const image = req.file ? req.file.path : oldImage;

    await NewsModel.updateNews(id, { title, description, content, image, status });

    res.json({ success: true, message: 'Cập nhật bài viết thành công' });
  } catch (err) {
    console.error('[newsController] updateNews error:', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật bài viết' });
  }
};

// ─── DELETE /api/news/:id (Admin) ─────────────────────────────────────────────
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await NewsModel.existsById(id);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin tức' });
    }

    await NewsModel.deleteNews(id);
    res.json({ success: true, message: 'Xóa bài viết thành công' });
  } catch (err) {
    console.error('[newsController] deleteNews error:', err);
    res.status(500).json({ success: false, message: 'Lỗi xóa bài viết' });
  }
};

// ─── PATCH /api/news/:id/status (Admin) – Bật/tắt trạng thái nhanh ──────────
exports.updateNewsStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu trường status' });
    }

    await NewsModel.updateStatus(id, status);
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    console.error('[newsController] updateNewsStatus error:', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái' });
  }
};

// Export middleware upload để dùng trong routes
exports.uploadNewsImage = uploadNewsImage;
