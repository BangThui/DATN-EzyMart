const db = require("../config/db");

const SettingModel = {
  getAll: async () => {
    const [rows] = await db.query("SELECT setting_key as `key`, setting_value as `value` FROM settings");
    return rows;
  },

  updateSettings: async (settings) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const key of Object.keys(settings)) {
        let value = settings[key];
        
        // Bỏ qua giá trị null/undefined (nhưng cho phép string rỗng)
        if (value !== undefined && value !== null) {
          // Object (như file upload từ ant design) thì không lưu thẳng vào DB được mà phải up lên cloud (cloudinary). 
          // Nhưng ở mức cơ bản, nếu là object thì chuyển string hoặc bỏ qua.
          if (typeof value === 'object') {
             // Thường logo/favicon sẽ upload riêng hoặc bỏ qua ở đây nếu chưa có logic upload file
             // Ta tạm bỏ qua nếu value là mảng (fileList của Ant Design) để không lỗi CSDL
             if (Array.isArray(value) && value.length > 0 && value[0].originFileObj) {
                 continue; // Bỏ qua file obj, cần xử lý upload riêng
             }
             value = JSON.stringify(value);
          }
          
          await connection.query(
            "INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?",
            [key, String(value), String(value)]
          );
        }
      }
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = SettingModel;
