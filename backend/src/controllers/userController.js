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

// [ADMIN] Lấy tất cả khách hàng (từ bảng users, role='customer' hoặc 1)
exports.getAllCustomers = async (req, res) => {
    try {
        const db = require('../config/db');
        const [rows] = await db.query(
            "SELECT user_id, user_name, user_email, user_phone, user_address FROM users WHERE role = 1 OR role = 'customer' ORDER BY user_id DESC"
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
// [ADMIN] Thêm tài khoản mới (cấp quyền)
exports.createUserByAdmin = async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { user_name, user_email, user_password, user_phone, user_address, role } = req.body;

        if (!user_name || !user_email || !user_password || !user_phone || !user_address) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin' });
        }

        // Kiểm tra email đã tồn tại chưa
        const [existing] = await UserModel.findByEmail(user_email);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email đã được sử dụng' });
        }

        // Băm mật khẩu bằng bcryptjs
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(user_password, salt);

        const [result] = await UserModel.create({
            name: user_name,
            email: user_email,
            password: hashedPassword,
            phone: user_phone,
            address: user_address,
            role: role !== undefined ? role : 2 // Mặc định là Nhân viên nếu không truyền
        });

        res.status(201).json({
            message: 'Tạo tài khoản thành công',
            userId: result.insertId,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi tạo tài khoản' });
    }
};

// [ADMIN] Cập nhật thông tin user và quyền
exports.updateUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_name, user_email, user_phone, user_address, role } = req.body;

        if (!user_name || !user_email || !user_phone || !user_address || role === undefined) {
            return res.status(400).json({ error: 'Vui lòng cung cấp đủ thông tin' });
        }

        // Kiểm tra email có trùng với user khác không
        const [existing] = await UserModel.findByEmail(user_email);
        if (existing.length > 0 && existing[0].user_id != id) {
            return res.status(409).json({ error: 'Email đã được sử dụng bởi người dùng khác' });
        }

        await UserModel.updateByAdmin(id, { user_name, user_email, user_phone, user_address, role });
        res.json({ message: 'Cập nhật tài khoản thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi cập nhật tài khoản' });
    }
};

// [ADMIN] Xóa tài khoản
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Chống tự xoá chính mình (Admin đang login)
        if (req.user && req.user.user_id == id) {
             return res.status(400).json({ error: 'Bạn không thể tự xoá tài khoản của chính mình' });
        }

        await UserModel.delete(id);
        res.json({ message: 'Xóa tài khoản thành công' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi xóa tài khoản' });
    }
};
