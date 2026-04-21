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
    c.category_name
`;

const ProductModel = {
  getAll: async (filters = {}) => {
    const { category, search, hot, isdeleted, admin } = filters;
    let query = `
            SELECT ${PRODUCT_SELECT},
                   MIN(v.variant_price) as min_price,
                   MAX(v.variant_price) as max_price,
                   SUM(v.variant_quantity) as total_quantity
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            LEFT JOIN product_variants v ON p.product_id = v.product_id
        `;
    let params = [];
    let conditions = [];

    if (category) {
      conditions.push("p.category_id = ?");
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

    query += " GROUP BY p.product_id ORDER BY p.product_id DESC";

    const [products] = await db.query(query, params);
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

  getById: async id => {
    const [products] = await db.query(
      `SELECT ${PRODUCT_SELECT} FROM products p LEFT JOIN categories c ON p.category_id = c.category_id WHERE p.product_id = ?`,
      [id],
    );
    if (products.length === 0) return [products];
    const [variants] = await db.query(
      "SELECT * FROM product_variants WHERE product_id = ?",
      [id],
    );
    products[0].variants = variants;
    return [products];
  },

  getSimilar: async (category_id, current_id) => {
    const [products] = await db.query(
      `SELECT ${PRODUCT_SELECT} FROM products p LEFT JOIN categories c ON p.category_id = c.category_id WHERE p.category_id = ? AND p.product_id != ? AND p.is_deleted = 0 AND p.product_active = 1 LIMIT 4`,
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

  createWithVariants: async (data, variants = []) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const {
        product_name,
        product_image,
        product_details,
        product_description,
        category_id,
      } = data;

      const [result] = await connection.query(
        "INSERT INTO products (product_name, product_image, product_details, product_description, category_id, product_active) VALUES (?, ?, ?, ?, ?, 1)",
        [
          product_name,
          product_image,
          product_details || "",
          product_description || "",
          category_id,
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

      await connection.commit();
      return [result];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  updateWithVariants: async (id, data, variants = []) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const {
        product_name,
        product_image,
        product_details,
        product_description,
        category_id,
      } = data;

      await connection.query(
        "UPDATE products SET product_name=?, product_image=?, product_details=?, product_description=?, category_id=? WHERE product_id=?",
        [
          product_name,
          product_image,
          product_details,
          product_description,
          category_id,
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

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  delete: async id => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
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
};

module.exports = ProductModel;
