const nodemailer = require("nodemailer");

// ─── Tạo transporter một lần, tái sử dụng ────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// ─── Helper: Validate email format ───────────────────────────────────────────
const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// ─── Helper: Validate Vietnamese phone number ─────────────────────────────────
const isValidPhone = (value) =>
  /^(0|\+84)(3[2-9]|5[6-9]|7[06-9]|8[0-9]|9[0-9])[0-9]{7}$/.test(value);

// ─── POST /api/contact ────────────────────────────────────────────────────────
exports.sendContactEmail = async (req, res) => {
  try {
    const { fullName, contactMethod, subject, message } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    const errors = [];

    if (!fullName || fullName.trim().length < 2) {
      errors.push("Họ và tên không hợp lệ (tối thiểu 2 ký tự).");
    }

    if (!contactMethod || contactMethod.trim() === "") {
      errors.push("Vui lòng nhập số điện thoại hoặc email.");
    } else {
      const trimmed = contactMethod.trim();
      if (!isValidEmail(trimmed) && !isValidPhone(trimmed)) {
        errors.push(
          "Số điện thoại hoặc email không đúng định dạng. Ví dụ: 0987654321 hoặc a@gmail.com"
        );
      }
    }

    if (!subject || subject.trim() === "") {
      errors.push("Vui lòng chọn chủ đề.");
    }

    if (!message || message.trim().length < 10) {
      errors.push("Nội dung tin nhắn quá ngắn (tối thiểu 10 ký tự).");
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(" | "), errors });
    }

    // ── Build email HTML ───────────────────────────────────────────────────────
    const sentAt = new Date().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0"
              style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;text-align:center;">
                  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">🛒 EzyMart</h1>
                  <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">
                    Tin nhắn phản hồi mới từ khách hàng
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 40px;">
                  <p style="margin:0 0 24px;font-size:15px;color:#374151;">
                    Bạn vừa nhận được một tin nhắn góp ý mới từ khách hàng qua trang Liên hệ.
                  </p>

                  <!-- Info Table -->
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                    <tr style="background:#f9fafb;">
                      <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#6b7280;width:160px;border-bottom:1px solid #e5e7eb;">
                        👤 Họ và tên
                      </td>
                      <td style="padding:12px 20px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;">
                        ${fullName.trim()}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">
                        📱 Liên hệ
                      </td>
                      <td style="padding:12px 20px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;">
                        ${contactMethod.trim()}
                      </td>
                    </tr>
                    <tr style="background:#f9fafb;">
                      <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">
                        🏷️ Chủ đề
                      </td>
                      <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;">
                        <span style="display:inline-block;background:#dcfce7;color:#166534;font-size:13px;
                          font-weight:600;padding:4px 12px;border-radius:20px;">
                          ${subject.trim()}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#6b7280;vertical-align:top;">
                        💬 Nội dung
                      </td>
                      <td style="padding:12px 20px;font-size:14px;color:#111827;line-height:1.7;">
                        ${message.trim().replace(/\n/g, "<br>")}
                      </td>
                    </tr>
                  </table>

                  <!-- Timestamp -->
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:right;">
                    🕐 Gửi lúc: ${sentAt}
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
                  <p style="margin:0;color:#a0aec0;font-size:12px;">
                    © 2026 EzyMart. Email này được tự động gửi từ hệ thống.
                  </p>
                </td>
              </tr>

            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    // ── Send email ─────────────────────────────────────────────────────────────
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"EzyMart - Phản hồi khách hàng 🛒" <${process.env.EMAIL_USER}>`,
      to: "thangbui5a@gmail.com", // Gửi về chính tài khoản quản trị (hoặc đổi thành support@ezymart.com)
      replyTo: isValidEmail(contactMethod.trim()) ? contactMethod.trim() : undefined,
      subject: `[Góp ý] ${subject} - từ ${fullName.trim()}`,
      html: htmlContent,
    });

    console.log(
      `📧 [Contact] Email gửi thành công từ: ${fullName.trim()} (${contactMethod.trim()})`
    );

    return res.status(200).json({
      message: "Gửi tin nhắn thành công! EzyMart sẽ phản hồi bạn sớm nhất.",
    });
  } catch (err) {
    console.error("❌ [Contact] Lỗi gửi email:", err);
    return res.status(500).json({
      error: "Gửi tin nhắn thất bại. Vui lòng thử lại sau hoặc liên hệ qua hotline.",
    });
  }
};
