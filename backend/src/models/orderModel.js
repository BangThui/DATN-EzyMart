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
      const { user_id, cart_items, total_price, note, payments, shipping_method, pickup_time } = data;

      // Validate shipping_method
      const shippingMethod = shipping_method === 'pickup' ? 'pickup' : 'delivery';
      // Nếu là pickup thì mặc định pickup_status = 'waiting', ngược lại là 'none'
      const pickupStatus = shippingMethod === 'pickup' ? 'waiting' : 'none';
      // pickup_time chỉ lưu khi là pickup
      const pickupTime = shippingMethod === 'pickup' && pickup_time ? new Date(pickup_time) : null;

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

      // 2. Tạo record orders (bao gồm các trường Click & Collect)
      const [orderResult] = await connection.query(
        `INSERT INTO orders (user_id, total_price, order_status, note, shipping_method, pickup_time, pickup_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id || null, total_price, "pending", note || '', shippingMethod, pickupTime, pickupStatus],
      );
      const order_id = orderResult.insertId;

      // 2.5 Tạo payment record
      let paymentMethod = 'COD';
      if (payments === '1' || payments === 1 || payments === 'BANK') {
        paymentMethod = 'BANK';
      } else if (payments === '2' || payments === 2 || payments === 'PAYPAL' || payments === 'paypal') {
        paymentMethod = 'PAYPAL';
      }
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
                o.shipping_method,
                o.pickup_time,
                o.pickup_status,
                pm.payment_method,
                pm.payment_status,
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
                o.user_id,
                o.order_id AS mahang,
                o.total_price AS tongDoanhThu,
                o.order_date AS ngayDatHang,
                ${STATUS_CASE},
                o.order_status,
                o.note,
                o.shipping_method,
                o.pickup_time,
                o.pickup_status,
                pm.payment_method,
                pm.payment_status,
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
        conditions.push('(o.order_id = ? OR u.user_phone LIKE ? OR u.user_name LIKE ?)');
        params.push(Number(trimmed), `%${trimmed}%`, `%${trimmed}%`);
      } else {
        conditions.push('(u.user_phone LIKE ? OR u.user_name LIKE ?)');
        params.push(`%${trimmed}%`, `%${trimmed}%`);
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
                o.shipping_method,
                o.pickup_time,
                o.pickup_status,
                pm.payment_method,
                pm.payment_status,
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

  /**
   * [ADMIN] Cập nhật pickup_status của đơn hàng nhận tại cửa hàng.
   *
   * Luồng tự động đồng bộ order_status:
   *   'prepared'  → order_status = 'processing'  (Chờ đến lấy – khách thấy "Sẵn sàng nhận")
   *   'received'  → order_status = 'completed'   (Hoàn thành)
   *                + payment_status = 'paid'      (nếu là COD)
   *
   * Trả về object { pickup_status, order_status, payment_status, was_completed, was_prepared }
   */
  updatePickupStatus: async (order_id, pickup_status) => {
    const validStatuses = ['waiting', 'prepared', 'received'];
    if (!validStatuses.includes(pickup_status)) {
      return Promise.reject(new Error(`pickup_status không hợp lệ: ${pickup_status}`));
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Kiểm tra đơn có tồn tại và là pickup không
      const [[order]] = await connection.query(
        `SELECT o.order_id, o.order_status, o.shipping_method, pm.payment_method, pm.payment_status
         FROM orders o
         LEFT JOIN payments pm ON o.order_id = pm.order_id
         WHERE o.order_id = ? AND o.shipping_method = 'pickup'
         FOR UPDATE`,
        [order_id]
      );

      if (!order) {
        throw Object.assign(
          new Error('Không tìm thấy đơn hàng nhận tại cửa hàng.'),
          { statusCode: 404 }
        );
      }

      // 2. Cập nhật pickup_status
      await connection.query(
        "UPDATE orders SET pickup_status = ? WHERE order_id = ?",
        [pickup_status, order_id]
      );

      let newOrderStatus = order.order_status;
      let newPaymentStatus = order.payment_status;
      let wasPrepared = false;
      let wasCompleted = false;

      // 3a. 'prepared' → order_status = 'confirmed' (Chờ đến lấy)
      if (pickup_status === 'prepared') {
        newOrderStatus = 'confirmed';
        wasPrepared = true;
        await connection.query(
          "UPDATE orders SET order_status = 'confirmed' WHERE order_id = ?",
          [order_id]
        );
      }

      // 3b. 'received' → order_status = 'completed' + COD paid
      if (pickup_status === 'received') {
        newOrderStatus = 'completed';
        wasCompleted = true;
        await connection.query(
          "UPDATE orders SET order_status = 'completed' WHERE order_id = ?",
          [order_id]
        );

        // Nếu là COD (tiền mặt tại quầy) → mark paid
        const isCOD = !order.payment_method ||
                      order.payment_method === 'COD' ||
                      order.payment_method === '0';
        if (isCOD && order.payment_status !== 'paid') {
          newPaymentStatus = 'paid';
          await connection.query(
            "UPDATE payments SET payment_status = 'paid' WHERE order_id = ?",
            [order_id]
          );
        }
      }

      await connection.commit();

      return {
        affectedRows: 1,
        pickup_status,
        order_status: newOrderStatus,
        payment_status: newPaymentStatus,
        was_prepared: wasPrepared,
        was_completed: wasCompleted,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = OrderModel;
