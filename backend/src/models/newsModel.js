const db = require('../config/db');

const NewsModel = {
  /**
   * Lấy danh sách tin tức (Admin: hỗ trợ lọc theo title và status)
   * @param {object} filters - { search: string, status: number|undefined }
   */
  getAllNews: async (filters = {}) => {
    const { search, status } = filters;
    let query = `
      SELECT news_id, title, description, image, created_at, updated_at, status
      FROM news
    `;
    const params = [];
    const conditions = [];

    if (search && search.trim()) {
      conditions.push('title LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    if (status !== undefined && status !== null && status !== '') {
      conditions.push('status = ?');
      params.push(Number(status));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    return rows;
  },

  /**
   * Lấy danh sách tin tức đang hoạt động (dùng cho trang public, status = 1)
   */
  getAll: async () => {
    const [rows] = await db.query(
      `SELECT news_id, title, description, image, created_at, updated_at
       FROM news
       WHERE status = 1
       ORDER BY created_at DESC`
    );
    return rows;
  },

  /**
   * Lấy chi tiết một tin tức theo ID
   * @param {number} id - news_id
   */
  getNewsById: async (id) => {
    const [rows] = await db.query(
      `SELECT news_id, title, description, content, image, created_at, updated_at, status
       FROM news
       WHERE news_id = ?`,
      [id]
    );
    return rows;
  },

  /**
   * Tạo bài viết mới
   * @param {object} data - { title, description, content, image, status }
   */
  createNews: async (data) => {
    const { title, description, content, image, status } = data;
    const [result] = await db.query(
      `INSERT INTO news (title, description, content, image, status)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description || null, content || null, image || null, status !== undefined ? Number(status) : 1]
    );
    return result;
  },

  /**
   * Cập nhật bài viết, tự động cập nhật updated_at = NOW()
   * @param {number} id - news_id
   * @param {object} data - { title, description, content, image, status }
   */
  updateNews: async (id, data) => {
    const { title, description, content, image, status } = data;
    const [result] = await db.query(
      `UPDATE news
       SET title = ?, description = ?, content = ?, image = ?, status = ?, updated_at = NOW()
       WHERE news_id = ?`,
      [title, description || null, content || null, image, status !== undefined ? Number(status) : 1, id]
    );
    return result;
  },

  /**
   * Xóa bài viết theo ID
   * @param {number} id - news_id
   */
  deleteNews: async (id) => {
    const [result] = await db.query('DELETE FROM news WHERE news_id = ?', [id]);
    return result;
  },

  /**
   * Cập nhật nhanh trạng thái (dùng cho Switch trong bảng)
   * @param {number} id - news_id
   * @param {number} status - 0 | 1
   */
  updateStatus: async (id, status) => {
    const [result] = await db.query(
      'UPDATE news SET status = ?, updated_at = NOW() WHERE news_id = ?',
      [Number(status), id]
    );
    return result;
  },

  /**
   * Kiểm tra tồn tại
   */
  existsById: async (id) => {
    const [rows] = await db.query('SELECT news_id FROM news WHERE news_id = ?', [id]);
    return rows;
  },
};

module.exports = NewsModel;
