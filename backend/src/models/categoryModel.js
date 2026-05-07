const db = require('../config/db');

const CategoryModel = {
    getAll: () => {
        return db.query('SELECT * FROM categories ORDER BY category_id ASC');
    },

    getById: (id) => {
        return db.query('SELECT * FROM categories WHERE category_id = ?', [id]);
    },

    create: (category_name, parent_id = null) => {
        return db.query('INSERT INTO categories (category_name, parent_id) VALUES (?, ?)', [category_name, parent_id || null]);
    },

    update: (id, category_name, parent_id = null) => {
        return db.query('UPDATE categories SET category_name = ?, parent_id = ? WHERE category_id = ?', [category_name, parent_id || null, id]);
    },

    delete: (id) => {
        return db.query('DELETE FROM categories WHERE category_id = ?', [id]);
    },

    getChildIds: async (parentId) => {
        const [rows] = await db.query('SELECT category_id FROM categories WHERE parent_id = ?', [parentId]);
        return rows.map(row => row.category_id);
    }
};

module.exports = CategoryModel;
