const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Đăng nhập bằng Google
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Google credential là bắt buộc" });
    }

    // Xác thực token với Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Tìm user theo email
    const [userRows] = await UserModel.findByEmail(email);
    let user;

    if (userRows.length === 0) {
      // Chưa có tài khoản → tự động tạo mới
      const randomPassword = Math.random().toString(36).slice(-10);
      const bcrypt = require("bcryptjs");
      const hashedPassword = bcrypt.hashSync(randomPassword, 10);

      const [result] = await UserModel.create({
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
        phone: "",
        address: "",
        role: 1, // Khách hàng
      });

      const [newUserRows] = await require("../config/db").query(
        "SELECT * FROM users WHERE user_id = ?",
        [result.insertId]
      );
      user = newUserRows[0];
    } else {
      // Đã có tài khoản → lấy đầy đủ thông tin
      const [fullUserRows] = await require("../config/db").query(
        "SELECT * FROM users WHERE user_id = ?",
        [userRows[0].user_id]
      );
      user = fullUserRows[0];
    }

    // Ký JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.user_email,
        name: user.user_name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    const { user_password, ...userWithoutPassword } = user;

    res.json({
      message: "Đăng nhập Google thành công",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).json({ error: "Xác thực Google thất bại. Vui lòng thử lại." });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu" });
    }

    // Thay vì dùng UserModel.findByEmailAndPassword (chỉ tìm plaintext), ta tìm user bằng email trước
    const [userRows] = await UserModel.findByEmail(email);

    if (userRows.length === 0) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }

    const userId = userRows[0].user_id;
    // Lấy thông tin đầy đủ bao gồm cả user_password
    const [fullUserRows] = await require('../config/db').query("SELECT * FROM users WHERE user_id = ?", [userId]);
    const user = fullUserRows[0];

    const bcrypt = require('bcryptjs');
    let isMatch = false;

    // Kiểm tra xem mật khẩu trong DB đã băm chưa (bcrypt hash thường bắt đầu bằng $2a$ hoặc $2b$)
    if (user.user_password.startsWith('$2a$') || user.user_password.startsWith('$2b$')) {
      isMatch = bcrypt.compareSync(password, user.user_password);
    } else {
      // So sánh plaintext (hỗ trợ tương thích ngược)
      isMatch = password === user.user_password;
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });
    }

    // Tạo JWT
    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.user_email,
        name: user.user_name,
        role: user.role, // 0 là Admin, 1 là Khách hàng, 2 là Nhân viên
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

    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const [result] = await UserModel.create({
      name,
      email,
      password: hashedPassword,
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
