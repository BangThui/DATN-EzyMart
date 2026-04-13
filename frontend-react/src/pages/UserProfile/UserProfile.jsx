import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Descriptions } from 'antd';
import { UserOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import './UserProfile.css';

const { Title } = Typography;

const UserProfile = () => {
    const { user, login, token } = useAuth();
    const [profileForm] = Form.useForm();
    const [passForm] = Form.useForm();
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPass, setSavingPass] = useState(false);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (user) {
            profileForm.setFieldsValue({
                user_name: user.user_name,
                user_phone: user.user_phone,
                user_address: user.user_address,
            });
        }
    }, [user]);

    const handleUpdateProfile = async (values) => {
        setSavingProfile(true);
        try {
            await userService.updateProfile(user.user_id, values);
            // Cập nhật context
            login({ ...user, ...values }, token);
            message.success('Cập nhật thông tin thành công');
            setEditing(false);
        } catch {
            message.error('Cập nhật thất bại');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async (values) => {
        setSavingPass(true);
        try {
            await userService.changePassword(user.user_id, {
                old_password: values.old_password,
                new_password: values.new_password
            });
            message.success('Đổi mật khẩu thành công');
            passForm.resetFields();
        } catch (err) {
            message.error(err.response?.data?.error || 'Đổi mật khẩu thất bại');
        } finally {
            setSavingPass(false);
        }
    };

    if (!user) return <div className="profile-not-logged-in">Vui lòng đăng nhập.</div>;

    return (
        <div className="profile-page-wrap">
            <Title level={2}><UserOutlined /> Hồ sơ cá nhân</Title>

            <Card title={<><EditOutlined /> Thông tin cá nhân</>} className="profile-card"
                extra={<Button type="link" onClick={() => setEditing(!editing)}>{editing ? 'Hủy' : 'Chỉnh sửa'}</Button>}>
                {!editing ? (
                    <Descriptions column={1} labelStyle={{ fontWeight: 600 }}>
                        <Descriptions.Item label="Họ tên">{user.user_name}</Descriptions.Item>
                        <Descriptions.Item label="Email">{user.user_email}</Descriptions.Item>
                        <Descriptions.Item label="Số điện thoại">{user.user_phone}</Descriptions.Item>
                        <Descriptions.Item label="Địa chỉ">{user.user_address}</Descriptions.Item>
                    </Descriptions>
                ) : (
                    <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
                        <Form.Item label="Họ tên" name="user_name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="Số điện thoại" name="user_phone">
                            <Input />
                        </Form.Item>
                        <Form.Item label="Địa chỉ" name="user_address">
                            <Input />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={savingProfile} className="profile-save-btn">
                            Lưu thay đổi
                        </Button>
                    </Form>
                )}
            </Card>

            <Card title={<><LockOutlined /> Đổi mật khẩu</>} className="profile-password-card">
                <Form form={passForm} layout="vertical" onFinish={handleChangePassword}>
                    <Form.Item label="Mật khẩu hiện tại" name="old_password" rules={[{ required: true }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item label="Mật khẩu mới" name="new_password" rules={[{ required: true, min: 6 }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item label="Xác nhận mật khẩu mới" name="confirm_password"
                        rules={[{ required: true }, ({ getFieldValue }) => ({
                            validator(_, val) {
                                if (!val || getFieldValue('new_password') === val) return Promise.resolve();
                                return Promise.reject('Mật khẩu xác nhận không khớp');
                            }
                        })]}>
                        <Input.Password />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={savingPass} danger>Đổi mật khẩu</Button>
                </Form>
            </Card>
        </div>
    );
};

export default UserProfile;
