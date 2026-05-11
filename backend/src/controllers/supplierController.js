const pool = require('../config/db');

// [ADMIN] Lấy danh sách nhà cung cấp (chưa bị xóa)
exports.getSuppliers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT supplier_id, supplier_name, supplier_phone, supplier_email, supplier_address, created_at
       FROM suppliers
       WHERE is_deleted = 0
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Lỗi lấy danh sách nhà cung cấp:', err);
    res.status(500).json({ error: 'Lỗi lấy danh sách nhà cung cấp' });
  }
};

// [ADMIN] Thêm nhà cung cấp mới
exports.createSupplier = async (req, res) => {
  const { supplier_name, supplier_phone, supplier_email, supplier_address } = req.body;

  if (!supplier_name || !supplier_name.trim()) {
    return res.status(400).json({ error: 'Tên nhà cung cấp không được để trống' });
  }

  try {
    // Kiểm tra tên đã tồn tại chưa
    const [existing] = await pool.execute(
      `SELECT supplier_id FROM suppliers WHERE supplier_name = ? AND is_deleted = 0`,
      [supplier_name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Tên nhà cung cấp đã tồn tại trong hệ thống' });
    }

    const [result] = await pool.execute(
      `INSERT INTO suppliers (supplier_name, supplier_phone, supplier_email, supplier_address)
       VALUES (?, ?, ?, ?)`,
      [supplier_name.trim(), supplier_phone || null, supplier_email || null, supplier_address || null]
    );

    res.status(201).json({
      message: 'Thêm nhà cung cấp thành công',
      supplier_id: result.insertId,
    });
  } catch (err) {
    console.error('Lỗi thêm nhà cung cấp:', err);
    res.status(500).json({ error: 'Lỗi server khi thêm nhà cung cấp' });
  }
};

// [ADMIN] Cập nhật nhà cung cấp
exports.updateSupplier = async (req, res) => {
  const { id } = req.params;
  const { supplier_name, supplier_phone, supplier_email, supplier_address } = req.body;

  if (!supplier_name || !supplier_name.trim()) {
    return res.status(400).json({ error: 'Tên nhà cung cấp không được để trống' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT supplier_id FROM suppliers WHERE supplier_id = ? AND is_deleted = 0`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhà cung cấp' });
    }

    // Kiểm tra tên trùng với NCC khác
    const [duplicate] = await pool.execute(
      `SELECT supplier_id FROM suppliers WHERE supplier_name = ? AND is_deleted = 0 AND supplier_id != ?`,
      [supplier_name.trim(), id]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ error: 'Tên nhà cung cấp đã tồn tại trong hệ thống' });
    }

    await pool.execute(
      `UPDATE suppliers
       SET supplier_name = ?, supplier_phone = ?, supplier_email = ?, supplier_address = ?
       WHERE supplier_id = ?`,
      [supplier_name.trim(), supplier_phone || null, supplier_email || null, supplier_address || null, id]
    );

    res.json({ message: 'Cập nhật nhà cung cấp thành công' });
  } catch (err) {
    console.error('Lỗi cập nhật nhà cung cấp:', err);
    res.status(500).json({ error: 'Lỗi server khi cập nhật nhà cung cấp' });
  }
};

// [ADMIN] Xóa mềm nhà cung cấp (set is_deleted = 1)
exports.deleteSupplier = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT supplier_id FROM suppliers WHERE supplier_id = ? AND is_deleted = 0`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhà cung cấp' });
    }

    await pool.execute(
      `UPDATE suppliers SET is_deleted = 1 WHERE supplier_id = ?`,
      [id]
    );

    res.json({ message: 'Xóa nhà cung cấp thành công' });
  } catch (err) {
    console.error('Lỗi xóa nhà cung cấp:', err);
    res.status(500).json({ error: 'Lỗi server khi xóa nhà cung cấp' });
  }
};
