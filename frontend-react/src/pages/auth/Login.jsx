import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Input, Button, message, Form, Typography } from "antd";
import {
  UserOutlined,
  LockOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import "./Login.css";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async values => {
    setLoading(true);
    try {
      const res = await authService.login(values);

      // Lưu thông tin đăng nhập
      login(res.user, res.token);

      // Xử lý điều hướng dựa trên role
      if (res.user.role === 0 || res.user.role === "0") {
        message.success(
          `Đăng nhập quản trị thành công! Xin chào ${res.user.user_name}`,
        );
        navigate("/admin");
      } else {
        message.success(`Đăng nhập thành công! Xin chào ${res.user.user_name}`);
        navigate("/");
      }
    } catch (err) {
      message.error(
        err.response?.data?.error || "Email hoặc mật khẩu không đúng",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/")}
        className="login-back-btn"
      >
        Quay lại trang chính
      </Button>

      <Card className="login-card" styles={{ body: { padding: "40px 32px" } }}>
        <div className="login-header">
          <div className="login-icon-wrap">🔐</div>
          <Title level={3} className="login-title">
            Đăng nhập
          </Title>
          <Text type="secondary">Đăng nhập vào hệ thống EzyMart</Text>
        </div>

        <Form
          name="unified_login"
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập Email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input
              prefix={<UserOutlined className="login-input-icon" />}
              placeholder="Email của bạn"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập Mật khẩu!" }]}
          >
            <Input.Password
              prefix={<LockOutlined className="login-input-icon" />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item className="login-form-item">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="login-submit-btn"
            >
              Đăng Nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
