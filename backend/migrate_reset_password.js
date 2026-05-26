/**
 * Script migration: Thêm 2 cột reset password vào bảng users
 * Chạy 1 lần bằng lệnh: node migrate_reset_password.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qlbanhang_final',
  });

  console.log('Kết nối database thành công!');

  try {
    await connection.execute(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS reset_password_expires DATETIME NULL
    `);
    console.log('✅ Migration thành công: Đã thêm cột reset_password_token và reset_password_expires vào bảng users.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Cột đã tồn tại, không cần migrate lại.');
    } else {
      console.error('❌ Migration thất bại:', err.message);
    }
  } finally {
    await connection.end();
    console.log('Đã đóng kết nối.');
  }
}

migrate();
