import React, { useState } from "react";
import { Form, Input, Button, Result, Typography } from "antd";
import { CheckCircleOutlined, LockOutlined } from "@ant-design/icons";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authService } from "../../services/authService";
import "./ResetPassword.css";

const { Title, Text } = Typography;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Không có token → hiển thị lỗi
  if (!token) {
    return (
      <div className="reset-page">
        <Result
          status="error"
          title="Liên kết không hợp lệ"
          subTitle="Đường dẫn khôi phục mật khẩu không đúng hoặc đã hết hạn."
          extra={<Link to="/"><Button type="primary">Về trang chủ</Button></Link>}
        />
      </div>
    );
  }

  const handleSubmit = async (values) => {
    setLoading(true);
    setErrorMsg("");
    try {
      await authService.resetPassword({ token, newPassword: values.newPassword });
      setSuccess(true);
      // Tự điều hướng về trang chủ sau 3 giây
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="reset-page">
        <div className="reset-card">
          <Result
            icon={<CheckCircleOutlined style={{ color: "#16a34a" }} />}
            title={<span style={{ color: "#1a202c" }}>Đặt lại mật khẩu thành công! 🎉</span>}
            subTitle={
              <Text style={{ color: "#4a5568", fontSize: 15 }}>
                Mật khẩu mới của bạn đã được cập nhật. Bạn sẽ được chuyển về trang chủ sau 3 giây...
              </Text>
            }
            extra={
              <Button
                type="primary"
                size="large"
                onClick={() => navigate("/")}
                style={{ background: "#16a34a", borderColor: "#16a34a" }}
              >
                Về trang chủ ngay
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="reset-page">
      <div className="reset-card">
        {/* Header */}
        <div className="reset-header">
          <div className="reset-icon">🔐</div>
          <Title level={3} style={{ margin: "12px 0 4px", color: "#1a202c" }}>
            Tạo mật khẩu mới
          </Title>
          <Text style={{ color: "#718096", fontSize: 14 }}>
            Nhập mật khẩu mới để hoàn tất khôi phục tài khoản
          </Text>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="reset-error">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Form */}
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="newPassword"
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Mật khẩu mới</span>}
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Tối thiểu 6 ký tự"
              style={{ borderRadius: 10, height: 48 }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span style={{ fontWeight: 600, color: "#374151" }}>Xác nhận mật khẩu mới</span>}
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Hai mật khẩu không khớp!"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Nhập lại mật khẩu mới"
              style={{ borderRadius: 10, height: 48 }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                height: 50,
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 16,
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                border: "none",
                boxShadow: "0 4px 12px rgba(22,163,74,0.35)",
              }}
            >
              {loading ? "Đang cập nhật..." : "🔑 Cập nhật mật khẩu"}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link
            to="/"
            style={{ color: "#9ca3af", fontSize: 13 }}
          >
            ← Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
