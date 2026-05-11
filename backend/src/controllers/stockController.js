const pool = require('../config/db');

// [ADMIN] Tạo phiếu nhập kho (dùng transaction)
exports.importStock = async (req, res) => {
  const { supplier_id, note, items } = req.body;

  // --- Validation đầu vào ---
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Danh sách sản phẩm nhập không được rỗng' });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.variant_id || !item.quantity || !item.import_price) {
      return res.status(400).json({
        error: `Dòng ${i + 1}: variant_id, quantity và import_price là bắt buộc`,
      });
    }
    if (Number(item.quantity) <= 0 || Number(item.import_price) < 0) {
      return res.status(400).json({
        error: `Dòng ${i + 1}: Số lượng phải > 0 và giá nhập >= 0`,
      });
    }
  }

  // Tính tổng tiền
  const total_cost = items.reduce((sum, item) => {
    return sum + Number(item.quantity) * Number(item.import_price);
  }, 0);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Kiểm tra supplier_id hợp lệ (nếu có cung cấp)
    if (supplier_id) {
      const [supplierRows] = await connection.execute(
        `SELECT supplier_id FROM suppliers WHERE supplier_id = ? AND is_deleted = 0`,
        [supplier_id]
      );
      if (supplierRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Nhà cung cấp không tồn tại hoặc đã bị xóa' });
      }
    }

    // --- Hành động 1: Lưu phiếu nhập (dùng supplier_id thay vì supplier_name) ---
    const [receiptResult] = await connection.execute(
      `INSERT INTO stock_receipts (supplier_id, total_cost, note) VALUES (?, ?, ?)`,
      [supplier_id || null, total_cost, note || null]
    );
    const receipt_id = receiptResult.insertId;

    // --- Hành động 2 & 3: Lưu chi tiết + cập nhật tồn kho ---
    for (const item of items) {
      const { variant_id, quantity, import_price } = item;

      // Kiểm tra variant tồn tại
      const [variantRows] = await connection.execute(
        `SELECT variant_id FROM product_variants WHERE variant_id = ?`,
        [variant_id]
      );
      if (variantRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          error: `Biến thể với ID ${variant_id} không tồn tại`,
        });
      }

      // Lưu chi tiết phiếu nhập
      await connection.execute(
        `INSERT INTO stock_receipt_details (receipt_id, variant_id, quantity, import_price)
         VALUES (?, ?, ?, ?)`,
        [receipt_id, variant_id, quantity, import_price]
      );

      // Cộng dồn số lượng tồn kho
      await connection.execute(
        `UPDATE product_variants SET variant_quantity = variant_quantity + ? WHERE variant_id = ?`,
        [quantity, variant_id]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Nhập kho thành công',
      receipt_id,
      total_cost,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Lỗi nhập kho:', err);
    res.status(500).json({ error: 'Lỗi server khi nhập kho. Giao dịch đã được hoàn tác.' });
  } finally {
    connection.release();
  }
};

// [ADMIN] Lấy danh sách phiếu nhập (JOIN với bảng suppliers để lấy supplier_name)
exports.getReceipts = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT sr.receipt_id, sr.supplier_id, s.supplier_name,
              sr.total_cost, sr.note, sr.created_at,
              COUNT(srd.detail_id) AS item_count
       FROM stock_receipts sr
       LEFT JOIN suppliers s ON sr.supplier_id = s.supplier_id AND s.is_deleted = 0
       LEFT JOIN stock_receipt_details srd ON sr.receipt_id = srd.receipt_id
       GROUP BY sr.receipt_id, sr.supplier_id, s.supplier_name, sr.total_cost, sr.note, sr.created_at
       ORDER BY sr.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Lỗi lấy danh sách phiếu nhập:', err);
    res.status(500).json({ error: 'Lỗi lấy danh sách phiếu nhập' });
  }
};

// [ADMIN] Lấy chi tiết 1 phiếu nhập
exports.getReceiptById = async (req, res) => {
  try {
    const { id } = req.params;

    const [receiptRows] = await pool.execute(
      `SELECT sr.receipt_id, sr.supplier_id, s.supplier_name,
              sr.total_cost, sr.note, sr.created_at
       FROM stock_receipts sr
       LEFT JOIN suppliers s ON sr.supplier_id = s.supplier_id AND s.is_deleted = 0
       WHERE sr.receipt_id = ?`,
      [id]
    );

    if (receiptRows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy phiếu nhập' });
    }

    const [detailRows] = await pool.execute(
      `SELECT srd.detail_id, srd.quantity, srd.import_price,
              pv.variant_id, pv.variant_name,
              p.product_name
       FROM stock_receipt_details srd
       JOIN product_variants pv ON srd.variant_id = pv.variant_id
       JOIN products p ON pv.product_id = p.product_id
       WHERE srd.receipt_id = ?`,
      [id]
    );

    res.json({ ...receiptRows[0], details: detailRows });
  } catch (err) {
    console.error('Lỗi lấy chi tiết phiếu nhập:', err);
    res.status(500).json({ error: 'Lỗi lấy chi tiết phiếu nhập' });
  }
};
