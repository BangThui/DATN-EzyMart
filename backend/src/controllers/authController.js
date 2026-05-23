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

// ─── FORGOT PASSWORD (OTP) ────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Vui lòng nhập email" });

    const [rows] = await UserModel.findByEmail(email);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Email này chưa được đăng ký trong hệ thống" });
    }

    // Tạo mã OTP 6 chữ số
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Lưu OTP vào DB (hết hạn 5 phút, MySQL tự tính timezone)
    await UserModel.saveOtp(email, otp);

    // Gửi email OTP
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"EzyMart 🛒" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Mã OTP khôi phục mật khẩu - EzyMart",
      html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center;">
                    <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">🛒 EzyMart</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Hệ thống quản lý đặt hàng trực tuyến</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px 40px 32px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:28px;">🔐</p>
                    <h2 style="margin:0 0 12px;color:#1a202c;font-size:20px;font-weight:600;">Mã xác nhận khôi phục mật khẩu</h2>
                    <p style="margin:0 0 28px;color:#4a5568;font-size:14px;line-height:1.7;">
                      Xin chào! Chúng tôi nhận được yêu cầu đặt lại mật khẩu.<br>
                      Hãy nhập mã OTP bên dưới vào trang web để tiếp tục.
                    </p>
                    <!-- OTP Box -->
                    <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #86efac;border-radius:16px;padding:28px 20px;margin:0 auto 28px;max-width:320px;">
                      <p style="margin:0 0 8px;color:#166534;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Mã OTP của bạn</p>
                      <p style="margin:0;color:#15803d;font-size:44px;font-weight:800;letter-spacing:10px;line-height:1;">${otp}</p>
                    </div>
                    <!-- Warning -->
                    <div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:10px;padding:14px 18px;text-align:left;margin-bottom:20px;">
                      <p style="margin:0;color:#92400e;font-size:13px;">
                        ⚠️ <strong>Lưu ý:</strong> Mã OTP này chỉ có hiệu lực trong <strong>5 phút</strong>.
                        Không chia sẻ mã này cho bất kỳ ai.
                      </p>
                    </div>
                    <p style="margin:0;color:#a0aec0;font-size:12px;">
                      Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
                    <p style="margin:0;color:#a0aec0;font-size:12px;">© 2026 EzyMart. Mọi quyền được bảo lưu.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    });

    res.json({ message: "Mã OTP đã được gửi vào Email của bạn. Vui lòng kiểm tra hộp thư!" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Gửi mã OTP thất bại. Vui lòng thử lại." });
  }
};

// ─── VERIFY OTP (Chỉ kiểm tra mã OTP đúng hay không) ───────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Vui lòng nhập mã OTP" });
    }

    const [rows] = await UserModel.findByEmailAndOtp(email, otp);
    if (rows.length === 0) {
      return res.status(400).json({ error: "Mã OTP không chính xác hoặc đã hết hạn" });
    }

    res.json({ message: "Mã OTP hợp lệ." });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Xác thực OTP thất bại. Vui lòng thử lại." });
  }
};

// ─── VERIFY OTP & RESET PASSWORD ──────────────────────────────────────────────
exports.verifyOtpReset = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Vui lòng điền đầy đủ thông tin" });
    }

    const [rows] = await UserModel.findByEmailAndOtp(email, otp);
    if (rows.length === 0) {
      return res.status(400).json({ error: "Mã OTP không chính xác hoặc đã hết hạn" });
    }

    const user = rows[0];
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await UserModel.updatePassword(user.user_id, hashedPassword);
    await UserModel.clearOtp(user.user_id);

    res.json({ message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới." });
  } catch (err) {
    console.error("Verify OTP reset error:", err);
    res.status(500).json({ error: "Đặt lại mật khẩu thất bại. Vui lòng thử lại." });
  }
};


