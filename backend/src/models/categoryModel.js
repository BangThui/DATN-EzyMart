const db = require('../config/db');

const CategoryModel = {
    getAll: () => {
        return db.query('SELECT * FROM tbl_category ORDER BY category_id ASC');
    },

    getById: (id) => {
        return db.query('SELECT * FROM tbl_category WHERE category_id = ?', [id]);
    },

    create: (category_name) => {
        return db.query('INSERT INTO tbl_category (category_name) VALUES (?)', [category_name]);
    },

    update: (id, category_name) => {
        return db.query('UPDATE tbl_category SET category_name = ? WHERE category_id = ?', [category_name, id]);
    },

    delete: (id) => {
        return db.query('DELETE FROM tbl_category WHERE category_id = ?', [id]);
    }
};

module.exports = CategoryModel;
