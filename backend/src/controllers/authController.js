const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });
    }

    // Kiểm tra user (Dùng chung cho cả Admin & Khách)
    const [userRows] = await UserModel.findByEmailAndPassword(email, password);

    if (userRows.length === 0) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }

    const user = userRows[0];

    // Tạo JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.user_email,
        name: user.user_name,
        role: user.role, // 0 là Admin, 1 là Khách hàng
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    const { user_password, ...userWithoutPassword } = user;

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Đăng nhập thất bại" });
  }
};

// Đăng ký
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
    }

    // Kiểm tra email đã tồn tại chưa
    const [existing] = await UserModel.findByEmail(email);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email đã được sử dụng" });
    }

    const [result] = await UserModel.create({
      name,
      email,
      password,
      phone,
      address,
    });

    res.status(201).json({
      message: "Đăng ký thành công",
      userId: result.insertId,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Đăng ký thất bại" });
  }
};

// Lấy thông tin user hiện tại (từ token)
exports.getMe = async (req, res) => {
  try {
    const [rows] = await UserModel.findById(req.user.user_id);
    if (rows.length === 0)
      return res.status(404).json({ error: "Không tìm thấy user" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi lấy thông tin user" });
  }
};
