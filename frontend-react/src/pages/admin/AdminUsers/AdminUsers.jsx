import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Form, Input, Select, Popconfirm, message, Space, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { userService } from '../../../services/userService';
import '../Admin.css';

const { Option } = Select;
const { Title } = Typography;

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [searchText, setSearchText] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await userService.getAllUsers();
            setUsers(data);
        } catch (error) {
            message.error('Lỗi khi tải danh sách tài khoản');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const showAddModal = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ role: 2 }); // Mặc định là Nhân viên
        setIsModalVisible(true);
    };

    const showEditModal = (record) => {
        setEditingUser(record);
        let roleVal = record.role;
        if (roleVal === 'admin') roleVal = 0;
        else if (roleVal === 'customer') roleVal = 1;
        else roleVal = parseInt(roleVal, 10);

        form.setFieldsValue({
            user_name: record.user_name,
            user_email: record.user_email,
            user_phone: record.user_phone,
            user_address: record.user_address,
            role: roleVal,
        });
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleSubmit = async (values) => {
        setSaving(true);
        try {
            if (editingUser) {
                // Sửa
                await userService.updateUserByAdmin(editingUser.user_id, values);
                message.success('Cập nhật tài khoản thành công');
            } else {
                // Thêm
                await userService.createUser(values);
                message.success('Thêm tài khoản thành công');
            }
            setIsModalVisible(false);
            fetchUsers();
        } catch (error) {
            if (error.response && error.response.data && error.response.data.error) {
                message.error(error.response.data.error);
            } else {
                message.error(editingUser ? 'Lỗi cập nhật tài khoản' : 'Lỗi thêm tài khoản');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await userService.deleteUser(id);
            message.success('Xoá tài khoản thành công');
            fetchUsers();
        } catch (error) {
            if (error.response && error.response.data && error.response.data.error) {
                message.error(error.response.data.error);
            } else {
                message.error('Lỗi khi xoá tài khoản');
            }
        }
    };

    const columns = [
        {
            title: 'Họ tên',
            dataIndex: 'user_name',
            key: 'user_name',
        },
        {
            title: 'Email',
            dataIndex: 'user_email',
            key: 'user_email',
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'user_phone',
            key: 'user_phone',
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'user_address',
            key: 'user_address',
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role) => {
                let roleNum = parseInt(role, 10);
                if (role === 'admin') roleNum = 0;
                if (role === 'customer') roleNum = 1;

                if (roleNum === 0) {
                    return <Tag color="red">Admin</Tag>;
                }
                if (roleNum === 2) {
                    return <Tag color="blue">Nhân viên</Tag>;
                }
                if (roleNum === 1) {
                    return <Tag color="green">Khách hàng</Tag>;
                }
                return <Tag>Unknown ({role})</Tag>;
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button 
                        icon={<EditOutlined />} 
                        onClick={() => showEditModal(record)}
                        size="small"
                    >
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xoá tài khoản này không?"
                        onConfirm={() => handleDelete(record.user_id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button 
                            danger 
                            icon={<DeleteOutlined />}
                            size="small"
                        >
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const filteredUsers = users.filter(user => {
        const matchSearch = (user.user_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
                            (user.user_email || '').toLowerCase().includes(searchText.toLowerCase());
        
        let userRoleNum = parseInt(user.role, 10);
        if (user.role === 'admin') userRoleNum = 0;
        if (user.role === 'customer') userRoleNum = 1;

        const matchRole = selectedRole === 'all' || userRoleNum === parseInt(selectedRole, 10);

        return matchSearch && matchRole;
    });

    return (
        <div
            style={{
                padding: 24,
                background: "#fff",
                minHeight: "100%",
                borderRadius: 8,
            }}
        >
            <div className="admin-page-header">
                <Title level={2}>👥 Quản lý tài khoản</Title>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={showAddModal}
                    className="admin-btn-primary"
                >
                    Thêm tài khoản
                </Button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <Input.Search 
                    placeholder="Tìm kiếm theo họ tên hoặc email..." 
                    onChange={(e) => setSearchText(e.target.value)} 
                    style={{ maxWidth: 300 }}
                    allowClear
                />
                <Select 
                    defaultValue="all" 
                    onChange={(val) => setSelectedRole(val)} 
                    style={{ width: 180 }}
                >
                    <Option value="all">Tất cả vai trò</Option>
                    <Option value="0">Quản trị viên</Option>
                    <Option value="2">Nhân viên</Option>
                    <Option value="1">Khách hàng</Option>
                </Select>
            </div>

            <Table 
                columns={columns} 
                dataSource={filteredUsers} 
                rowKey="user_id" 
                loading={loading}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    locale: { items_per_page: '/ trang' },
                    showTotal: (total) => `Tổng ${total} tài khoản`,
                }}
            />

            <Modal
                title={editingUser ? 'Sửa thông tin tài khoản' : 'Thêm tài khoản mới'}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="user_name"
                        label="Họ tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="user_email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' }
                        ]}
                    >
                        <Input />
                    </Form.Item>
                    
                    {!editingUser && (
                        <Form.Item
                            name="user_password"
                            label="Mật khẩu"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="user_phone"
                        label="Số điện thoại"
                        rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="user_address"
                        label="Địa chỉ"
                        rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    
                    <Form.Item
                        name="role"
                        label="Vai trò"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                    >
                        <Select>
                            <Option value={0}>Quản trị viên</Option>
                            <Option value={2}>Nhân viên</Option>
                            <Option value={1}>Khách hàng</Option>
                        </Select>
                    </Form.Item>

                    <div className="admin-form-actions">
                        <Button onClick={handleCancel}>Hủy</Button>
                        <Button 
                            type="primary" 
                            htmlType="submit"
                            loading={saving}
                            className="admin-btn-primary"
                        >
                            {editingUser ? "Cập nhật" : "Thêm mới"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminUsers;
