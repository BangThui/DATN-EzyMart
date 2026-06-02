const SettingModel = require("../models/settingModel");

const settingController = {
  getSettings: async (req, res) => {
    try {
      const settings = await SettingModel.getAll();
      // Chuyển array [{key, value}] thành object {key: value} cho tiện dùng frontend
      const settingsObj = {};
      settings.forEach(item => {
        settingsObj[item.key] = item.value;
      });
      res.json(settingsObj);
    } catch (error) {
      console.error("Lỗi get settings:", error);
      res.status(500).json({ error: "Lỗi server khi lấy cài đặt" });
    }
  },

  updateSettings: async (req, res) => {
    try {
      const settings = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
      }

      // Xử lý file nếu có upload ảnh mới
      if (req.files) {
        if (req.files['logo'] && req.files['logo'][0]) {
          settings.logo = req.files['logo'][0].path;
        }
        if (req.files['favicon'] && req.files['favicon'][0]) {
          settings.favicon = req.files['favicon'][0].path;
        }
      }

      await SettingModel.updateSettings(settings);
      res.json({ message: "Cập nhật cài đặt thành công" });
    } catch (error) {
      console.error("Lỗi update settings:", error);
      res.status(500).json({ error: "Lỗi server khi cập nhật cài đặt" });
    }
  }
};

module.exports = settingController;
