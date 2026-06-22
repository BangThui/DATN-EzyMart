const express = require("express");
const router = express.Router();
const { sendContactEmail } = require("../controllers/contactController");

// POST /api/contact
// Nhận form góp ý từ khách hàng và gửi email thông báo về quản trị
router.post("/", sendContactEmail);

module.exports = router;
