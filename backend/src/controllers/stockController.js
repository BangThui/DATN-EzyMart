const pool = require('../config/db');

// [ADMIN] Tạo phiếu nhập kho (dùng transaction)
exports.importStock = async (req, res) => {
  const { supplier_id, note, items } = req.body;
  const user_id = req.user.user_id;

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
    let supplier_name = null;
    if (supplier_id) {
      const [supplierRows] = await connection.execute(
        `SELECT supplier_id, supplier_name FROM suppliers WHERE supplier_id = ? AND is_deleted = 0`,
        [supplier_id]
      );
      if (supplierRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Nhà cung cấp không tồn tại hoặc đã bị xóa' });
      }
      supplier_name = supplierRows[0].supplier_name;
    }

    // --- Hành động 1: Lưu phiếu nhập (dùng cả supplier_id và supplier_name để đảm bảo tương thích ngược) ---
    const [receiptResult] = await connection.execute(
      `INSERT INTO stock_receipts (supplier_id, supplier_name, total_cost, note, user_id) VALUES (?, ?, ?, ?, ?)`,
      [supplier_id || null, supplier_name, total_cost, note || null, user_id]
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

// [ADMIN] Nhập kho hàng loạt nhiều sản phẩm cùng lúc (Bulk Import)
exports.bulkImportStock = async (req, res) => {
  const { supplier_id, note, items } = req.body;
  const user_id = req.user.user_id;

  // --- Validation ---
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

  // Bước 1: Tính tổng tiền của toàn bộ lô hàng
  const total_cost = items.reduce((sum, item) => {
    return sum + Number(item.quantity) * Number(item.import_price);
  }, 0);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Kiểm tra supplier_id hợp lệ (nếu có cung cấp)
    let supplier_name = null;
    if (supplier_id) {
      const [supplierRows] = await connection.execute(
        `SELECT supplier_id, supplier_name FROM suppliers WHERE supplier_id = ? AND is_deleted = 0`,
        [supplier_id]
      );
      if (supplierRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Nhà cung cấp không tồn tại hoặc đã bị xóa' });
      }
      supplier_name = supplierRows[0].supplier_name;
    }

    // Bước 1: INSERT vào stock_receipts để lấy receipt_id
    const [receiptResult] = await connection.execute(
      `INSERT INTO stock_receipts (supplier_id, supplier_name, total_cost, note, user_id) VALUES (?, ?, ?, ?, ?)`,
      [supplier_id || null, supplier_name, total_cost, note || null, user_id]
    );
    const receipt_id = receiptResult.insertId;

    // Bước 2 & 3: Vòng lặp qua từng item: INSERT chi tiết + UPDATE tồn kho
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

      // Bước 2: INSERT INTO stock_receipt_details
      await connection.execute(
        `INSERT INTO stock_receipt_details (receipt_id, variant_id, quantity, import_price) VALUES (?, ?, ?, ?)`,
        [receipt_id, variant_id, Number(quantity), Number(import_price)]
      );

      // Bước 3: UPDATE tồn kho – cộng dồn số lượng
      await connection.execute(
        `UPDATE product_variants SET variant_quantity = variant_quantity + ? WHERE variant_id = ?`,
        [Number(quantity), variant_id]
      );
    }

    // Commit toàn bộ transaction nếu mọi thứ thành công
    await connection.commit();

    res.status(201).json({
      message: `Nhập kho hàng loạt thành công! Đã tạo phiếu nhập #${receipt_id} với ${items.length} loại sản phẩm.`,
      receipt_id,
      total_cost,
      item_count: items.length,
    });
  } catch (err) {
    await connection.rollback();
    console.error('Lỗi nhập kho hàng loạt:', err);
    res.status(500).json({ error: 'Lỗi server khi nhập kho. Giao dịch đã được hoàn tác.' });
  } finally {
    connection.release();
  }
};

// [ADMIN] Lấy danh sách phiếu nhập (JOIN với bảng suppliers để lấy supplier_name)
exports.getReceipts = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let timeCondition = '';
    const params = [];
    
    if (startDate && endDate) {
      timeCondition = 'WHERE DATE(sr.created_at) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const [rows] = await pool.execute(
      `SELECT sr.receipt_id, sr.supplier_id, s.supplier_name,
              sr.total_cost, sr.note, sr.created_at,
              u.user_name AS creator_name,
              COUNT(srd.detail_id) AS item_count
       FROM stock_receipts sr
       LEFT JOIN suppliers s ON sr.supplier_id = s.supplier_id AND s.is_deleted = 0
       LEFT JOIN users u ON sr.user_id = u.user_id
       LEFT JOIN stock_receipt_details srd ON sr.receipt_id = srd.receipt_id
       ${timeCondition}
       GROUP BY sr.receipt_id, sr.supplier_id, s.supplier_name, sr.total_cost, sr.note, sr.created_at, u.user_name
       ORDER BY sr.created_at DESC`,
      params
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
