const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const path = require('path');

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

// [ADMIN] Xuất PDF phiếu nhập kho
exports.exportInventoryReceiptPDF = async (req, res) => {
    try {
        const { id } = req.params;

        // Lấy thông tin phiếu nhập
        const [receiptRows] = await pool.execute(
            `SELECT sr.receipt_id, sr.supplier_id, s.supplier_name,
                    sr.total_cost, sr.note, sr.created_at, u.user_name as creator_name
             FROM stock_receipts sr
             LEFT JOIN suppliers s ON sr.supplier_id = s.supplier_id AND s.is_deleted = 0
             LEFT JOIN users u ON sr.user_id = u.user_id
             WHERE sr.receipt_id = ?`,
            [id]
        );

        if (receiptRows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy phiếu nhập' });
        }
        const receipt = receiptRows[0];

        // Lấy chi tiết phiếu nhập
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

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const fontPathRegular = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="PhieuNhapKho_${id}.pdf"`);
        doc.pipe(res);

        // Header
        const leftWidth = 200;
        doc.font(fontPathBold).fontSize(10);
        doc.text('CỬA HÀNG TIỆN LỢI EZYMART', 50, 50, { align: 'center', width: leftWidth });
        doc.text('Hotline: 0349484515', 50, 65, { align: 'center', width: leftWidth });

        const rightWidth = 260;
        const rightX = 545 - rightWidth;
        doc.text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', rightX, 50, { align: 'center', width: rightWidth });
        doc.font(fontPathRegular).text('Độc lập - Tự do - Hạnh phúc', rightX, 65, { align: 'center', width: rightWidth });
        
        const lineLength = 140;
        const lineStartX = rightX + (rightWidth - lineLength) / 2;
        doc.moveTo(lineStartX, 80).lineTo(lineStartX + lineLength, 80).stroke(); // Line under motto

        doc.moveDown(4);

        // Title
        doc.font(fontPathBold).fontSize(16).text('PHIẾU NHẬP KHO', 50, doc.y, { align: 'center', width: 495 });
        doc.moveDown(0.5);

        const createdDate = new Date(receipt.created_at);
        const dateStr = `Ngày ${String(createdDate.getDate()).padStart(2, '0')} tháng ${String(createdDate.getMonth() + 1).padStart(2, '0')} năm ${createdDate.getFullYear()}`;
        doc.font(fontPathRegular).fontSize(11).text(`Số: #${receipt.receipt_id}`, 50, doc.y, { align: 'center', width: 495 });
        doc.text(dateStr, 50, doc.y, { align: 'center', width: 495 });
        doc.moveDown(2);

        // Info
        doc.font(fontPathRegular).fontSize(11);
        doc.text(`Nhà cung cấp: ${receipt.supplier_name || 'Không có'}`, 50, doc.y);
        doc.text(`Người tạo phiếu: ${receipt.creator_name || 'Không rõ'}`, 50, doc.y);
        doc.text(`Ghi chú: ${receipt.note || 'Không có'}`, 50, doc.y);
        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y;
        const colX = [50, 90, 270, 340, 430];
        
        doc.font(fontPathBold).fontSize(10);
        doc.text('STT', colX[0], tableTop);
        doc.text('Tên sản phẩm', colX[1], tableTop);
        doc.text('Số lượng', colX[2], tableTop, { width: 60, align: 'right' });
        doc.text('Đơn giá', colX[3], tableTop, { width: 80, align: 'right' });
        doc.text('Thành tiền', colX[4], tableTop, { width: 115, align: 'right' });
        
        doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

        // Table Rows
        let currentY = tableTop + 25;
        doc.font(fontPathRegular).fontSize(10);

        detailRows.forEach((item, index) => {
            const quantity = Number(item.quantity);
            const importPrice = Number(item.import_price);
            const total = quantity * importPrice;
            const productName = `${item.product_name} ${item.variant_name ? '- ' + item.variant_name : ''}`.trim();

            doc.text(index + 1, colX[0], currentY);
            doc.text(productName, colX[1], currentY, { width: 170 });
            doc.text(quantity.toString(), colX[2], currentY, { width: 60, align: 'right' });
            doc.text(importPrice.toLocaleString('vi-VN'), colX[3], currentY, { width: 80, align: 'right' });
            doc.text(total.toLocaleString('vi-VN'), colX[4], currentY, { width: 115, align: 'right' });

            const textHeight = doc.heightOfString(productName, { width: 170 });
            currentY += Math.max(textHeight, 15) + 10;
            
            // Handle page break for long lists
            if (currentY > 750) {
                doc.addPage();
                currentY = 50;
            }
        });

        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 15;

        // Total
        doc.font(fontPathBold).fontSize(11);
        const totalAmount = Number(receipt.total_cost).toLocaleString('vi-VN') + ' VNĐ';
        const amountWidth = doc.widthOfString(totalAmount);
        const amountStartX = 545 - amountWidth;
        
        doc.text('Tổng tiền thanh toán:', 50, currentY, { width: amountStartX - 50 - 15, align: 'right' });
        doc.text(totalAmount, amountStartX, currentY);
        
        currentY += 50;

        // Signatures
        if (currentY > 700) {
            doc.addPage();
            currentY = 50;
        }

        doc.fontSize(11);
        doc.text('Người giao hàng', 50, currentY, { align: 'center', width: 150 });
        doc.text('Người nhận hàng (Thủ kho)', 222.5, currentY, { align: 'center', width: 150 });
        doc.text('Quản lý cửa hàng', 395, currentY, { align: 'center', width: 150 });
        
        doc.font(fontPathRegular).fontSize(10);
        doc.text('(Ký và ghi rõ họ tên)', 50, currentY + 15, { align: 'center', width: 150 });
        doc.text('(Ký và ghi rõ họ tên)', 222.5, currentY + 15, { align: 'center', width: 150 });
        doc.text('(Ký và ghi rõ họ tên)', 395, currentY + 15, { align: 'center', width: 150 });

        doc.end();

    } catch (error) {
        console.error('Lỗi xuất phiếu nhập PDF:', error);
        res.status(500).json({ error: 'Lỗi xuất phiếu nhập PDF' });
    }
};

// [ADMIN] Xuất PDF Danh sách phiếu nhập (Báo cáo)
exports.exportStockReportPDF = async (req, res) => {
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

        const doc = new PDFDocument({ size: 'A4', margin: 50, layout: 'landscape' });
        const fontPathRegular = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="BaoCaoNhapKho_${startDate || 'all'}.pdf"`);
        doc.pipe(res);

        // Header
        const leftWidth = 200;
        doc.font(fontPathBold).fontSize(10);
        doc.text('CỬA HÀNG TIỆN LỢI EZYMART', 50, 50, { align: 'center', width: leftWidth });
        doc.text('Hotline: 0349484515', 50, 65, { align: 'center', width: leftWidth });

        const rightWidth = 260;
        const rightX = 792 - 50 - rightWidth;
        doc.text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', rightX, 50, { align: 'center', width: rightWidth });
        doc.font(fontPathRegular).text('Độc lập - Tự do - Hạnh phúc', rightX, 65, { align: 'center', width: rightWidth });
        
        const lineLength = 140;
        const lineStartX = rightX + (rightWidth - lineLength) / 2;
        doc.moveTo(lineStartX, 80).lineTo(lineStartX + lineLength, 80).stroke();

        doc.moveDown(4);

        // Title
        doc.font(fontPathBold).fontSize(16).text('BÁO CÁO DANH SÁCH NHẬP KHO', 50, doc.y, { align: 'center', width: 692 });
        doc.moveDown(0.5);

        const periodText = (startDate && endDate) ? `Từ ngày ${startDate} đến ngày ${endDate}` : 'Tất cả thời gian';
        doc.font(fontPathRegular).fontSize(12).text(`Kỳ báo cáo: ${periodText}`, 50, doc.y, { align: 'center', width: 692 });
        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y;
        const colX = [50, 90, 180, 400, 520, 600];
        
        doc.font(fontPathBold).fontSize(10);
        doc.text('STT', colX[0], tableTop);
        doc.text('Mã phiếu', colX[1], tableTop);
        doc.text('Nhà cung cấp', colX[2], tableTop);
        doc.text('Ngày nhập', colX[3], tableTop);
        doc.text('Số SP', colX[4], tableTop, { width: 50, align: 'center' });
        doc.text('Tổng tiền', colX[5], tableTop, { width: 142, align: 'right' });
        
        doc.moveTo(50, tableTop + 15).lineTo(742, tableTop + 15).stroke();

        // Table Rows
        let currentY = tableTop + 25;
        doc.font(fontPathRegular).fontSize(10);
        
        let totalAmount = 0;

        rows.forEach((item, index) => {
            const dateStr = new Date(item.created_at).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const cost = Number(item.total_cost || 0);
            totalAmount += cost;

            doc.text(index + 1, colX[0], currentY);
            doc.text(`#${item.receipt_id}`, colX[1], currentY);
            doc.text(item.supplier_name || '---', colX[2], currentY, { width: 200 });
            doc.text(dateStr, colX[3], currentY);
            doc.text(item.item_count, colX[4], currentY, { width: 50, align: 'center' });
            doc.text(cost.toLocaleString('vi-VN') + ' đ', colX[5], currentY, { width: 142, align: 'right' });

            const textHeight = doc.heightOfString(item.supplier_name || '---', { width: 200 });
            currentY += Math.max(textHeight, 15) + 10;
            
            if (currentY > 500) {
                doc.addPage({ size: 'A4', margin: 50, layout: 'landscape' });
                currentY = 50;
            }
        });

        doc.moveTo(50, currentY).lineTo(742, currentY).stroke();
        currentY += 15;

        // Total
        doc.font(fontPathBold).fontSize(11);
        const totalAmountStr = totalAmount.toLocaleString('vi-VN') + ' đ';
        const amountWidth = doc.widthOfString(totalAmountStr);
        const amountStartX = 742 - amountWidth;
        
        doc.text('Tổng cộng:', 50, currentY, { width: amountStartX - 50 - 15, align: 'right' });
        doc.text(totalAmountStr, amountStartX, currentY);

        doc.end();

    } catch (error) {
        console.error('Lỗi xuất báo cáo PDF:', error);
        res.status(500).json({ error: 'Lỗi xuất báo cáo PDF' });
    }
};
