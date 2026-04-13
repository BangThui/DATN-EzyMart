import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, message, Form, Typography } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../../../context/AuthContext';
import { authService } from '../../../services/authService';
import './AdminLogin.css';

const { Title, Text } = Typography;

const AdminLogin = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const res = await authService.login(values);
            // Kiểm tra role sau khi đăng nhập thành công
            if (res.user.role === 1 || res.user.role === '1') {
                login(res.user, res.token);
                message.success(`Đăng nhập quản trị thành công! Xin chào ${res.user.user_name}`);
                navigate('/admin');
            } else {
                message.error('Truy cập bị từ chối! Tài khoản không có quyền Admin.');
            }
        } catch (err) {
            message.error(err.response?.data?.error || 'Email hoặc mật khẩu không đúng');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-login-wrapper">
            <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/')}
                className="admin-login-back-btn"
            >
                Quay lại trang chính
            </Button>

            <Card 
                className="admin-login-card"
                styles={{ body: { padding: '40px 32px' } }}
            >
                <div className="admin-login-header">
                    <div className="admin-login-icon-wrap">
                        🛡️
                    </div>
                    <Title level={3} className="admin-login-title">Quản trị viên</Title>
                    <Text type="secondary">Đăng nhập vào hệ thống Admin</Text>
                </div>

                <Form
                    name="admin_login"
                    layout="vertical"
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                        ]}
                    >
                        <Input 
                            prefix={<UserOutlined className="admin-login-input-icon" />} 
                            placeholder="Email quản trị" 
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                    >
                        <Input.Password 
                            prefix={<LockOutlined className="admin-login-input-icon" />} 
                            placeholder="Mật khẩu" 
                        />
                    </Form.Item>

                    <Form.Item className="admin-login-form-item">
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading}
                            block
                            className="admin-login-submit-btn"
                        >
                            Đăng Nhập
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default AdminLogin;
