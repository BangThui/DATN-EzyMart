const db = require("../config/db");

const PRODUCT_SELECT = `
    p.product_id,
    p.category_id,
    p.product_name,
    p.product_details,
    p.product_description,
    p.product_active,
    p.is_deleted,
    p.deleted_at,
    p.product_hot,
    p.product_image,
    p.brand_id,
    c.category_name,
    b.brand_name,
    b.brand_logo
`;

const ProductModel = {
  getAll: async (filters = {}) => {
    const { category, search, hot, isdeleted, admin, brand_id } = filters;
    let query = `
            SELECT ${PRODUCT_SELECT},
                   MIN(v.variant_price) as min_price,
                   MAX(v.variant_price) as max_price,
                   SUM(v.variant_quantity) as total_quantity
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN brands b ON p.brand_id = b.brand_id
            LEFT JOIN product_variants v ON p.product_id = v.product_id
        `;
    let params = [];
    let conditions = [];

    if (category) {
      if (Array.isArray(category)) {
        conditions.push("p.category_id IN (?)");
      } else {
        conditions.push("p.category_id = ?");
      }
      params.push(category);
    }
    if (search) {
      conditions.push("p.product_name LIKE ?");
      params.push(`%${search}%`);
    }
    if (hot !== undefined) {
      conditions.push("p.product_hot = ?");
      params.push(hot);
    }
    if (brand_id) {
      conditions.push("p.brand_id = ?");
      params.push(brand_id);
    }

    if (isdeleted !== undefined) {
      conditions.push("p.is_deleted = ?");
      params.push(Number(isdeleted));
    } else {
      conditions.push("p.is_deleted = 0");
    }

    // Lọc sản phẩm ngừng hoạt động cho User public interface
    if (!admin && isdeleted === undefined) {
      conditions.push("p.product_active = 1");
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " GROUP BY p.product_id";
    
    // Only show active products that have a stock quantity greater than 0 for public users
    if (!admin && isdeleted === undefined) {
      query += " HAVING total_quantity > 0";
    }

    query += " ORDER BY p.product_id DESC";

    const [products] = await db.query(query, params);
    if (products.length === 0) return [products];

    const pIds = products.map(p => p.product_id);

    const [variants] = await db.query(
      `SELECT pv.*,
              srd.import_price AS last_import_price
       FROM product_variants pv
       LEFT JOIN stock_receipt_details srd
         ON srd.detail_id = (
           SELECT detail_id FROM stock_receipt_details
           WHERE variant_id = pv.variant_id
           ORDER BY detail_id DESC LIMIT 1
         )
       WHERE pv.product_id IN (?)`,
      [pIds],
    );

    // Lấy ảnh đầu tiên từ product_images cho mỗi sản phẩm (dùng cho card)
    const [allImages] = await db.query(
      "SELECT * FROM product_images WHERE product_id IN (?) ORDER BY image_id ASC",
      [pIds],
    );

    const formatted = products.map(p => {
      p.variants = variants.filter(v => v.product_id === p.product_id);
      p.images = allImages.filter(img => img.product_id === p.product_id);
      return p;
    });
    return [formatted];
  },

  filterProducts: async (filters = {}) => {
    const { category_id, brand_id, minPrice, maxPrice } = filters;
    let query = `
      SELECT p.product_id,
             p.category_id,
             p.product_name,
             p.product_details,
             p.product_description,
             p.product_active,
             p.is_deleted,
             p.product_hot,
             p.product_image,
             p.brand_id,
             c.category_name,
             b.brand_name,
             MIN(v.variant_price) as min_price,
             MAX(v.variant_price) as max_price,
             SUM(v.variant_quantity) as total_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      JOIN product_variants v ON p.product_id = v.product_id
      WHERE p.product_active = 1 AND p.is_deleted = 0
    `;
    let params = [];

    if (category_id) {
      if (Array.isArray(category_id)) {
        query += " AND p.category_id IN (?)";
      } else {
        query += " AND p.category_id = ?";
      }
      params.push(category_id);
    }

    if (brand_id) {
      query += " AND p.brand_id = ?";
      params.push(brand_id);
    }

    query += " GROUP BY p.product_id";

    // Logic giá: Lọc theo variant_price thấp nhất của sản phẩm và yêu cầu tồn kho > 0 cho public shop.
    let havingConditions = ["total_quantity > 0"];
    if (minPrice !== undefined && minPrice !== '') {
      havingConditions.push("min_price >= ?");
      params.push(Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      havingConditions.push("min_price <= ?");
      params.push(Number(maxPrice));
    }

    if (havingConditions.length > 0) {
      query += " HAVING " + havingConditions.join(" AND ");
    }

    query += " ORDER BY p.product_id DESC";

    const [products] = await db.query(query, params);
    if (products.length === 0) return [products];

    const pIds = products.map(p => p.product_id);

    const [variants] = await db.query(
      "SELECT * FROM product_variants WHERE product_id IN (?)",
      [pIds],
    );

    const [allImages] = await db.query(
      "SELECT * FROM product_images WHERE product_id IN (?) ORDER BY image_id ASC",
      [pIds],
    );

    const formatted = products.map(p => {
      p.variants = variants.filter(v => v.product_id === p.product_id);
      p.images = allImages.filter(img => img.product_id === p.product_id);
      return p;
    });
    return [formatted];
  },

  getById: async id => {
    const [products] = await db.query(
      `SELECT ${PRODUCT_SELECT} FROM products p LEFT JOIN categories c ON p.category_id = c.category_id LEFT JOIN brands b ON p.brand_id = b.brand_id WHERE p.product_id = ?`,
      [id],
    );
    if (products.length === 0) return [products];

    const [variants] = await db.query(
      `SELECT pv.*,
              srd.import_price AS last_import_price
       FROM product_variants pv
       LEFT JOIN stock_receipt_details srd
         ON srd.detail_id = (
           SELECT detail_id FROM stock_receipt_details
           WHERE variant_id = pv.variant_id
           ORDER BY detail_id DESC LIMIT 1
         )
       WHERE pv.product_id = ?`,
      [id],
    );

    // Lấy tất cả ảnh từ product_images
    const [images] = await db.query(
      "SELECT * FROM product_images WHERE product_id = ? ORDER BY image_id ASC",
      [id],
    );

    products[0].variants = variants;
    products[0].images = images; // [{ image_id, product_id, image_url }]
    return [products];
  },

  getSimilar: async (category_id, current_id) => {
    const [products] = await db.query(
      `SELECT ${PRODUCT_SELECT}, SUM(v.variant_quantity) as total_quantity 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.category_id 
       LEFT JOIN brands b ON p.brand_id = b.brand_id
       JOIN product_variants v ON p.product_id = v.product_id
       WHERE p.category_id = ? AND p.product_id != ? AND p.is_deleted = 0 AND p.product_active = 1 
       GROUP BY p.product_id
       HAVING total_quantity > 0
       LIMIT 4`,
      [category_id, current_id],
    );
    if (products.length === 0) return [products];
    const pIds = products.map(p => p.product_id);
    const [variants] = await db.query(
      "SELECT * FROM product_variants WHERE product_id IN (?)",
      [pIds],
    );
    const formatted = products.map(p => {
      p.variants = variants.filter(v => v.product_id === p.product_id);
      return p;
    });
    return [formatted];
  },

  createWithVariants: async (data, variants = [], imageFilenames = []) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const {
        product_name,
        product_image,
        product_details,
        product_description,
        category_id,
        brand_id,
      } = data;

      const [result] = await connection.query(
        "INSERT INTO products (product_name, product_image, product_details, product_description, category_id, brand_id, product_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
        [
          product_name,
          product_image,
          product_details || "",
          product_description || "",
          category_id,
          brand_id || null,
        ],
      );

      const newId = result.insertId;

      for (const v of variants) {
        await connection.query(
          "INSERT INTO product_variants (product_id, variant_name, variant_price, variant_discount, variant_quantity, sku) VALUES (?, ?, ?, ?, ?, ?)",
          [
            newId,
            v.variant_name,
            v.variant_price,
            v.variant_discount || 0,
            v.variant_quantity || 0,
            v.sku || "",
          ],
        );
      }

      // Lưu tất cả ảnh vào product_images
      for (const filename of imageFilenames) {
        await connection.query(
          "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)",
          [newId, filename],
        );
      }

      await connection.commit();
      return [result];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateWithVariants: async (id, data, variants = [], imageFilenames = []) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const {
        product_name,
        product_image,
        product_details,
        product_description,
        category_id,
        brand_id,
      } = data;

      await connection.query(
        "UPDATE products SET product_name=?, product_image=?, product_details=?, product_description=?, category_id=?, brand_id=? WHERE product_id=?",
        [
          product_name,
          product_image,
          product_details,
          product_description,
          category_id,
          brand_id || null,
          id,
        ],
      );

      const [existingVars] = await connection.query(
        "SELECT variant_id FROM product_variants WHERE product_id = ?",
        [id],
      );
      const existingVarIds = existingVars.map(v => v.variant_id);
      const inputVarIds = variants
        .map(v => Number(v.variant_id))
        .filter(v_id => !isNaN(v_id) && v_id > 0);

      const toDelete = existingVarIds.filter(
        v_id => !inputVarIds.includes(v_id),
      );
      if (toDelete.length > 0) {
        await connection.query(
          "DELETE FROM product_variants WHERE variant_id IN (?)",
          [toDelete],
        );
      }

      for (const v of variants) {
        if (v.variant_id) {
          await connection.query(
            "UPDATE product_variants SET variant_name=?, variant_price=?, variant_discount=?, variant_quantity=?, sku=? WHERE variant_id=?",
            [
              v.variant_name,
              v.variant_price,
              v.variant_discount || 0,
              v.variant_quantity || 0,
              v.sku || "",
              v.variant_id,
            ],
          );
        } else {
          await connection.query(
            "INSERT INTO product_variants (product_id, variant_name, variant_price, variant_discount, variant_quantity, sku) VALUES (?, ?, ?, ?, ?, ?)",
            [
              id,
              v.variant_name,
              v.variant_price,
              v.variant_discount || 0,
              v.variant_quantity || 0,
              v.sku || "",
            ],
          );
        }
      }

      // Xóa TOÀN BỘ ảnh cũ trong product_images
      await connection.query(
        "DELETE FROM product_images WHERE product_id = ?",
        [id],
      );

      // Thêm lại ảnh từ danh sách mới (từ vị trí 1 trở đi)
      for (const filename of imageFilenames) {
        await connection.query(
          "INSERT INTO product_images (product_id, image_url) VALUES (?, ?)",
          [id, filename],
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Xóa 1 ảnh theo image_id (kiểm tra product_id để bảo mật)
  deleteImage: (imageId, productId) => {
    return db.query(
      "DELETE FROM product_images WHERE image_id = ? AND product_id = ?",
      [imageId, productId],
    );
  },

  delete: async id => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM product_images WHERE product_id = ?", [id]);
      await connection.query("DELETE FROM product_variants WHERE product_id = ?", [id]);
      await connection.query("DELETE FROM products WHERE product_id = ?", [id]);
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  softDelete: id => {
    return db.query("UPDATE products SET is_deleted = 1 WHERE product_id = ?", [id]);
  },

  restore: id => {
    return db.query("UPDATE products SET is_deleted = 0 WHERE product_id = ?", [id]);
  },

  existsById: id => {
    return db.query("SELECT product_id FROM products WHERE product_id = ?", [
      id,
    ]);
  },

  updateStatus: (id, status) => {
    return db.query("UPDATE products SET product_active = ? WHERE product_id = ?", [status, id]);
  },

  getDetailsByVariants: async (variantIds) => {
    if (!variantIds || variantIds.length === 0) return [];
    const [rows] = await db.query(
      `SELECT pv.variant_id, pv.variant_name, pv.sku, pv.variant_price, pv.variant_quantity,
              p.product_id, p.product_name, p.product_image
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.product_id
       WHERE pv.variant_id IN (?)`,
      [variantIds]
    );
    return rows;
  },

  checkDuplicateSkus: async (skus, excludeProductId = null) => {
    if (!skus || skus.length === 0) return [];
    let query = "SELECT sku FROM product_variants WHERE sku IN (?) AND sku IS NOT NULL AND sku != ''";
    let params = [skus];
    if (excludeProductId) {
      query += " AND product_id != ?";
      params.push(excludeProductId);
    }
    const [rows] = await db.query(query, params);
    return rows.map(r => r.sku);
  },
};

module.exports = ProductModel;
