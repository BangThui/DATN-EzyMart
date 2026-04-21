const db = require('../config/db');

const NewsModel = {
  /**
   * Lấy danh sách tin tức đang hoạt động (status = 1)
   * Sắp xếp theo created_at mới nhất trước
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
  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT news_id, title, description, content, image, created_at, updated_at, status
       FROM news
       WHERE news_id = ?`,
      [id]
    );
    return rows;
  },
};

module.exports = NewsModel;
