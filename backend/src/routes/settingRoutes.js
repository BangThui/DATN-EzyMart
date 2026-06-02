const express = require("express");
const router = express.Router();
const settingController = require("../controllers/settingController");
const upload = require("../middleware/uploadMiddleware");
// const authMiddleware = require("../middlewares/authMiddleware"); // Nếu cần verify admin

// Lấy tất cả cài đặt
router.get("/", settingController.getSettings);

// Cập nhật cài đặt (Tạm thời mở public, hoặc thêm middleware xác thực Admin)
router.put("/update", upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]), settingController.updateSettings);

module.exports = router;
