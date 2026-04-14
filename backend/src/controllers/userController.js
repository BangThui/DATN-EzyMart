const UserModel = require('../models/userModel');

// Lấy thông tin user theo ID
exports.getUserById = async (req, res) => {
    try {
        const [rows] = await UserModel.findById(req.params.id);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy user' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy thông tin user' });
    }
};

// Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_phone, user_address } = req.body;
        await UserModel.updateProfile(id, { user_name, user_phone, user_address });
        res.json({ message: 'Cập nhật thông tin thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật thông tin' });
    }
};

// Đổi mật khẩu
exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { old_password, new_password } = req.body;

        const [rows] = await UserModel.findPasswordById(id);
        if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy user' });

        if (rows[0].user_password !== old_password) {
            return res.status(401).json({ error: 'Mật khẩu cũ không đúng' });
        }

        await UserModel.updatePassword(id, new_password);
        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi đổi mật khẩu' });
    }
};

// [ADMIN] Lấy tất cả khách hàng (từ bảng users, role='customer')
exports.getAllCustomers = async (req, res) => {
    try {
        const db = require('../config/db');
        const [rows] = await db.query(
            "SELECT user_id, user_name, user_email, user_phone, user_address FROM users WHERE role = 'customer' ORDER BY user_id DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách khách hàng' });
    }
};

// [ADMIN] Lấy tất cả tài khoản user
exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await UserModel.getAll();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy danh sách users' });
    }
};
