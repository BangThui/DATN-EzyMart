const db = require('../config/db');

const BrandModel = {
    getAll: (categoryId = null) => {
        let query = `
            SELECT b.*, GROUP_CONCAT(bc.category_id) as category_ids 
            FROM brands b
            LEFT JOIN brand_categories bc ON b.brand_id = bc.brand_id
        `;
        let params = [];
        if (categoryId) {
            if (Array.isArray(categoryId)) {
                query += ' WHERE b.brand_id IN (SELECT brand_id FROM brand_categories WHERE category_id IN (?))';
            } else {
                query += ' WHERE b.brand_id IN (SELECT brand_id FROM brand_categories WHERE category_id = ?)';
            }
            params.push(categoryId);
        }
        query += ' GROUP BY b.brand_id ORDER BY b.brand_id ASC';
        return db.query(query, params);
    },

    getById: (id) => {
        return db.query(`
            SELECT b.*, GROUP_CONCAT(bc.category_id) as category_ids 
            FROM brands b
            LEFT JOIN brand_categories bc ON b.brand_id = bc.brand_id
            WHERE b.brand_id = ?
            GROUP BY b.brand_id
        `, [id]);
    },

    getByName: (brand_name, excludeId = null) => {
        if (excludeId) {
            return db.query('SELECT * FROM brands WHERE TRIM(LOWER(brand_name)) = TRIM(LOWER(?)) AND brand_id != ?', [brand_name, excludeId]);
        }
        return db.query('SELECT * FROM brands WHERE TRIM(LOWER(brand_name)) = TRIM(LOWER(?))', [brand_name]);
    },

    create: (brand_name, brand_logo) => {
        return db.query('INSERT INTO brands (brand_name, brand_logo) VALUES (?, ?)', [brand_name, brand_logo]);
    },

    update: (id, brand_name, brand_logo) => {
        if (brand_logo) {
            return db.query('UPDATE brands SET brand_name = ?, brand_logo = ? WHERE brand_id = ?', [brand_name, brand_logo, id]);
        } else {
            return db.query('UPDATE brands SET brand_name = ? WHERE brand_id = ?', [brand_name, id]);
        }
    },

    addCategory: (brand_id, category_id) => {
        return db.query('INSERT INTO brand_categories (brand_id, category_id) VALUES (?, ?)', [brand_id, category_id]);
    },

    clearCategories: (brand_id) => {
        return db.query('DELETE FROM brand_categories WHERE brand_id = ?', [brand_id]);
    },

    delete: (id) => {
        // DELETE FROM brands also requires deleting from brand_categories if no cascade is set, 
        // but typically bridge tables have ON DELETE CASCADE. 
        // To be safe, we can manually delete from brand_categories first.
        return db.query('DELETE FROM brand_categories WHERE brand_id = ?').then(() => {
            return db.query('DELETE FROM brands WHERE brand_id = ?', [id]);
        });
    }
};

module.exports = BrandModel;
