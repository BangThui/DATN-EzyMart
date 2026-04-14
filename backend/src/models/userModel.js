const db = require("../config/db");

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// Bảng: quanli_user → users
// role: 'admin' → 1, 'customer' → 0  (alias giữ nguyên tên cột "role" cho FE)
// Bỏ: user_code (không có trong schema mới)
// ───────────────────────────────────────────────────────────────────────────

// Lấy thông tin người dùng theo email và mật khẩu (Dùng chung cho cả Admin và Customer)
const UserModel = {
  findByEmailAndPassword: (email, password) => {
    return db.query(
      `SELECT user_id, user_name, user_email, user_phone, user_address, user_password, role
             FROM users WHERE user_email = ? AND user_password = ?`,
      [email, password],
    );
  },

  findByEmail: email => {
    return db.query("SELECT user_id FROM users WHERE user_email = ?", [email]);
  },

  findById: id => {
    return db.query(
      `SELECT user_id, user_name, user_email, user_phone, user_address, role FROM users WHERE user_id = ?`,
      [id],
    );
  },

  findPasswordById: id => {
    return db.query("SELECT user_password FROM users WHERE user_id = ?", [id]);
  },

  getAll: () => {
    return db.query(
      `SELECT user_id, user_name, user_email, user_phone, user_address, role FROM users ORDER BY user_id ASC`,
    );
  },

  create: data => {
    const { name, email, password, phone, address } = data;
    return db.query(
      "INSERT INTO users (user_name, user_email, user_password, user_phone, user_address, role) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, password, phone, address, 1], // 1 = Khách hàng
    );
  },

  updateProfile: (id, data) => {
    const { user_name, user_phone, user_address } = data;
    return db.query(
      "UPDATE users SET user_name = ?, user_phone = ?, user_address = ? WHERE user_id = ?",
      [user_name, user_phone, user_address, id],
    );
  },

  updatePassword: (id, new_password) => {
    return db.query("UPDATE users SET user_password = ? WHERE user_id = ?", [
      new_password,
      id,
    ]);
  },
};

module.exports = UserModel;
