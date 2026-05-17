const db = require("../config/db");

// ─── Adapter: qlbanhang_v2 → qlbanhang_final ───────────────────────────────
// donhang + customer + giaodich → orders + order_items + users
//
// Field aliasing (output phải giống v2 cho FE):
//   o.order_id          → mahang
//   o.total_price       → tongDoanhThu
//   o.order_date        → ngayDatHang
//   order_status ENUM   → trangThai (pending=0, confirmed=1, shipping=2, completed=3, cancelled=4)
//   oi.quantity         → soluong
//   u.user_name         → customer_name
//   u.user_phone        → customer_phone
//   u.user_email        → customer_email
// ───────────────────────────────────────────────────────────────────────────

// Map order_status ENUM → số (giống trangThai v2)
const STATUS_MAP = {
  pending: 0,
  confirmed: 1,
  shipping: 2,
  completed: 3,
  cancelled: 4,
};
const STATUS_REVERSE = [
  "pending",
  "confirmed",
  "shipping",
  "completed",
  "cancelled",
];

// SQL CASE để alias trangThai dạng số
const STATUS_CASE = `
    CASE o.order_status
        WHEN 'pending'   THEN 0
        WHEN 'confirmed' THEN 1
        WHEN 'shipping'  THEN 2
        WHEN 'completed' THEN 3
        WHEN 'cancelled' THEN 4
        ELSE 0
    END AS trangThai
`;

const OrderModel = {
  /**
   * Tạo đơn hàng: INSERT orders + N order_items
   * Trả về { order_id } dùng làm mahang
   */
  createOrder: async data => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const { user_id, cart_items, total_price, note, payments } = data;

      // 1. Kiểm tra tồn kho trước khi tạo đơn
      for (const item of cart_items) {
        const qty = item.product_quantity || item.quantity || 1;
        const [[variant]] = await connection.query(
          "SELECT variant_quantity, variant_name FROM product_variants WHERE variant_id = ? FOR UPDATE",
          [item.variant_id],
        );
        if (!variant || variant.variant_quantity < qty) {
          throw Object.assign(
            new Error(`Sản phẩm "${item.product_name || variant?.variant_name || 'N/A'}" đã hết hàng hoặc không đủ số lượng.`),
            { statusCode: 400 }
          );
        }
      }

      // 2. Tạo record orders
      const [orderResult] = await connection.query(
        "INSERT INTO orders (user_id, total_price, order_status, note) VALUES (?, ?, ?, ?)",
        [user_id || null, total_price, "pending", note || ''],
      );
      const order_id = orderResult.insertId;

      // 2.5 Tạo payment record
      const paymentMethod = payments === '1' || payments === 1 ? 'BANK' : 'COD';
      await connection.query(
        "INSERT INTO payments (order_id, payment_method, payment_status) VALUES (?, ?, ?)",
        [order_id, paymentMethod, "pending"]
      );

      // 3. Tạo từng order_item và trừ tồn kho
      for (const item of cart_items) {
        const qty = item.product_quantity || item.quantity || 1;
        const price =
          item.variant_discount &&
          Number(item.variant_discount) > 0 &&
          Number(item.variant_discount) < Number(item.variant_price)
            ? item.variant_discount
            : item.variant_price;

        await connection.query(
          "INSERT INTO order_items (order_id, product_id, variant_id, quantity, price) VALUES (?, ?, ?, ?, ?)",
          [order_id, item.product_id, item.variant_id, qty, price],
        );

        // Trừ tồn kho
        await connection.query(
          "UPDATE product_variants SET variant_quantity = variant_quantity - ? WHERE variant_id = ?",
          [qty, item.variant_id],
        );
      }

      await connection.commit();
      return order_id;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Lấy đơn hàng theo user_id (thay thế getByUserCode)
   */
  getByUserId: user_id => {
    return db.query(
      `SELECT
                o.order_id AS mahang,
                o.total_price AS tongDoanhThu,
                o.order_date AS ngayDatHang,
                ${STATUS_CASE},
                o.order_status,
                o.note,
                pm.payment_method,
                oi.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.quantity AS soluong,
                oi.price AS variant_price,
                p.product_name,
                p.product_image,
                pv.variant_name,
                pv.variant_discount,
                u.user_name AS customer_name,
                u.user_phone AS customer_phone,
                u.user_email AS customer_email,
                u.user_address AS customer_address
             FROM orders o
             LEFT JOIN order_items oi ON o.order_id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.product_id
             LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN users u ON o.user_id = u.user_id
             LEFT JOIN payments pm ON o.order_id = pm.order_id
             WHERE o.user_id = ?
             ORDER BY o.order_id DESC`,
      [user_id],
    );
  },

  /**
   * Lấy chi tiết 1 đơn hàng theo mahang (order_id)
   */
  getByMahang: mahang => {
    return db.query(
      `SELECT
                o.order_id AS mahang,
                o.total_price AS tongDoanhThu,
                o.order_date AS ngayDatHang,
                ${STATUS_CASE},
                o.order_status,
                o.note,
                pm.payment_method,
                oi.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.quantity AS soluong,
                oi.price AS variant_price,
                p.product_name,
                p.product_image,
                pv.variant_name,
                pv.variant_discount,
                u.user_name AS customer_name,
                u.user_phone AS customer_phone,
                u.user_email AS customer_email,
                u.user_address AS customer_address
             FROM orders o
             LEFT JOIN order_items oi ON o.order_id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.product_id
             LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN users u ON o.user_id = u.user_id
             LEFT JOIN payments pm ON o.order_id = pm.order_id
             WHERE o.order_id = ?`,
      [mahang],
    );
  },

  /**
   * [ADMIN] Lấy tất cả đơn hàng
   */
  getAll: ({ search, status, method } = {}) => {
    const conditions = ['1=1'];
    const params = [];

    if (search && search.trim()) {
      const trimmed = search.trim();
      const isNumeric = /^\d+$/.test(trimmed);
      if (isNumeric) {
        conditions.push('(o.order_id = ? OR u.user_phone LIKE ?)');
        params.push(Number(trimmed), `%${trimmed}%`);
      } else {
        conditions.push('u.user_phone LIKE ?');
        params.push(`%${trimmed}%`);
      }
    }

    if (status && status !== 'all') {
      conditions.push('o.order_status = ?');
      params.push(status);
    }

    if (method && method !== 'all') {
      conditions.push('pm.payment_method = ?');
      params.push(method);
    }

    const whereClause = conditions.join(' AND ');

    return db.query(
      `SELECT
                o.order_id AS mahang,
                o.total_price AS tongDoanhThu,
                o.order_date AS ngayDatHang,
                ${STATUS_CASE},
                o.order_status,
                o.note,
                pm.payment_method,
                o.user_id,
                oi.order_item_id,
                oi.product_id,
                oi.variant_id,
                oi.quantity AS soluong,
                oi.price AS variant_price,
                p.product_name,
                p.product_image,
                pv.variant_name,
                u.user_name AS customer_name,
                u.user_phone AS customer_phone,
                u.user_email AS customer_email,
                u.user_address AS customer_address
             FROM orders o
             LEFT JOIN order_items oi ON o.order_id = oi.order_id
             LEFT JOIN products p ON oi.product_id = p.product_id
             LEFT JOIN product_variants pv ON oi.variant_id = pv.variant_id
             LEFT JOIN users u ON o.user_id = u.user_id
             LEFT JOIN payments pm ON o.order_id = pm.order_id
             WHERE ${whereClause}
             ORDER BY o.order_id DESC`,
      params,
    );
  },

  /**
   * Cập nhật trạng thái đơn hàng
   * Nhận trangThai (số 0-4) hoặc chuỗi ENUM
   */
  updateStatus: (order_id, trangThai) => {
    // Chấp nhận cả số (0-4) lẫn chuỗi enum
    const statusStr =
      typeof trangThai === "number"
        ? STATUS_REVERSE[trangThai] || "pending"
        : trangThai;
    return db.query("UPDATE orders SET order_status = ? WHERE order_id = ?", [
      statusStr,
      order_id,
    ]);
  },

  /**
   * Hủy đơn hàng và hoàn trả tồn kho trong cùng 1 transaction
   * - Kiểm tra trạng thái hiện tại có được phép hủy không
   * - Chỉ hoàn kho nếu đơn chưa ở trạng thái 'cancelled'
   */
  cancelOrderWithStockRestore: async (order_id) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy trạng thái hiện tại của đơn hàng (lóc để tránh race condition)
      const [[order]] = await connection.query(
        "SELECT order_status FROM orders WHERE order_id = ? FOR UPDATE",
        [order_id],
      );

      if (!order) {
        throw Object.assign(new Error('Không tìm thấy đơn hàng.'), { statusCode: 404 });
      }

      const cancellableStatuses = ['pending', 'confirmed', 0, 1];
      if (!cancellableStatuses.includes(order.order_status)) {
        throw Object.assign(
          new Error('Không thể hủy đơn hàng đang trong quá trình vận chuyển hoặc đã hoàn thành.'),
          { statusCode: 400 }
        );
      }

      // Lấy danh sách sản phẩm trong đơn để hoàn kho
      const [items] = await connection.query(
        "SELECT oi.variant_id, oi.product_id, oi.quantity FROM order_items oi WHERE oi.order_id = ?",
        [order_id],
      );

      // Hoàn trả tồn kho + ghi nhận số mới để trả về cho socket
      const restoredItems = [];
      for (const item of items) {
        await connection.query(
          "UPDATE product_variants SET variant_quantity = variant_quantity + ? WHERE variant_id = ?",
          [item.quantity, item.variant_id],
        );
        const [[updated]] = await connection.query(
          "SELECT variant_quantity FROM product_variants WHERE variant_id = ?",
          [item.variant_id],
        );
        restoredItems.push({
          variant_id: item.variant_id,
          product_id: item.product_id,
          newStock: updated?.variant_quantity ?? 0,
        });
      }

      // Cập nhật trạng thái đơn hàng sang hủy
      await connection.query(
        "UPDATE orders SET order_status = 'cancelled' WHERE order_id = ?",
        [order_id],
      );

      await connection.commit();
      return restoredItems; // Trả về để controller emit socket
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Lấy user_id của đơn hàng (dùng để gửi socket riêng cho khách hàng)
   */
  getOrderUserInfo: (order_id) => {
    return db.query(
      "SELECT order_id, user_id FROM orders WHERE order_id = ?",
      [order_id],
    );
  },

  /**
   * Lấy số lượng tồn kho hiện tại của 1 variant (dùng sau khi đặt hàng để emit socket)
   */
  getVariantStockById: (variant_id) => {
    return db.query(
      "SELECT variant_id, variant_quantity FROM product_variants WHERE variant_id = ?",
      [variant_id],
    );
  },
};

module.exports = OrderModel;
