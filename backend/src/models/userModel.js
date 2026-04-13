const db = require('../config/db');

const UserModel = {
    findByEmailAndPassword: (email, password) => {
        return db.query(
            'SELECT * FROM quanli_user WHERE user_email = ? AND user_password = ?',
            [email, password]
        );
    },

    findAdminByEmailAndPassword: (email, password) => {
        return db.query(
            "SELECT * FROM quanli_user WHERE user_email = ? AND user_password = ? AND role = '1'",
            [email, password]
        );
    },

    findByEmail: (email) => {
        return db.query('SELECT user_id FROM quanli_user WHERE user_email = ?', [email]);
    },

    findById: (id) => {
        return db.query(
            'SELECT user_id, user_name, user_email, user_phone, user_address, user_code, role FROM quanli_user WHERE user_id = ?',
            [id]
        );
    },

    findPasswordById: (id) => {
        return db.query('SELECT user_password FROM quanli_user WHERE user_id = ?', [id]);
    },

    getAll: () => {
        return db.query(
            'SELECT user_id, user_name, user_email, user_phone, user_address, user_code, role FROM quanli_user ORDER BY user_id ASC'
        );
    },

    create: (data) => {
        const { name, email, password, phone, address } = data;
        return db.query(
            'INSERT INTO quanli_user (user_name, user_email, user_password, user_phone, user_address, user_code) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, password, phone, address, 0]
        );
    },

    updateProfile: (id, data) => {
        const { user_name, user_phone, user_address } = data;
        return db.query(
            'UPDATE quanli_user SET user_name = ?, user_phone = ?, user_address = ? WHERE user_id = ?',
            [user_name, user_phone, user_address, id]
        );
    },

    updatePassword: (id, new_password) => {
        return db.query('UPDATE quanli_user SET user_password = ? WHERE user_id = ?', [new_password, id]);
    },

    updateUserCode: (user_id, user_code) => {
        return db.query('UPDATE quanli_user SET user_code = ? WHERE user_id = ?', [user_code, user_id]);
    }
};

module.exports = UserModel;
