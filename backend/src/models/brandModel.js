const db = require('../config/db');

const BrandModel = {
    getAll: (categoryId = null) => {
        let query = 'SELECT * FROM brands';
        let params = [];
        if (categoryId) {
            if (Array.isArray(categoryId)) {
                query += ' WHERE category_id IN (?)';
            } else {
                query += ' WHERE category_id = ?';
            }
            params.push(categoryId);
        }
        query += ' ORDER BY brand_id ASC';
        return db.query(query, params);
    },

    getById: (id) => {
        return db.query('SELECT * FROM brands WHERE brand_id = ?', [id]);
    },

    create: (brand_name, brand_logo, category_id) => {
        return db.query('INSERT INTO brands (brand_name, brand_logo, category_id) VALUES (?, ?, ?)', [brand_name, brand_logo, category_id || null]);
    },

    update: (id, brand_name, brand_logo, category_id) => {
        if (brand_logo) {
            return db.query('UPDATE brands SET brand_name = ?, brand_logo = ?, category_id = ? WHERE brand_id = ?', [brand_name, brand_logo, category_id || null, id]);
        } else {
            return db.query('UPDATE brands SET brand_name = ?, category_id = ? WHERE brand_id = ?', [brand_name, category_id || null, id]);
        }
    },

    delete: (id) => {
        return db.query('DELETE FROM brands WHERE brand_id = ?', [id]);
    }
};

module.exports = BrandModel;
