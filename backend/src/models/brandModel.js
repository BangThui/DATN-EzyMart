const db = require('../config/db');

const BrandModel = {
    getAll: () => {
        return db.query('SELECT * FROM brands ORDER BY brand_id ASC');
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
