import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { categoryService } from '../../../services/categoryService';
import '../Admin.css';

const { Title } = Typography;

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await categoryService.getAll();
            setCategories(data || []);
        } catch { message.error('Lỗi tải danh mục'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const openAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalVisible(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await categoryService.delete(id);
            message.success('Đã xóa danh mục');
            fetchData();
        } catch { message.error('Xóa thất bại'); }
    };

    const handleSubmit = async (values) => {
        setSaving(true);
        try {
            if (editingRecord) {
                await categoryService.update(editingRecord.category_id, values);
                message.success('Cập nhật thành công');
            } else {
                await categoryService.create(values);
                message.success('Thêm danh mục thành công');
            }
            setModalVisible(false);
            fetchData();
        } catch { message.error('Thao tác thất bại'); }
        finally { setSaving(false); }
    };

    const columns = [
        { title: 'ID', dataIndex: 'category_id', width: 80 },
        { title: 'Tên danh mục', dataIndex: 'category_name' },
        {
            title: 'Thao tác',
            render: (_, r) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)}>Sửa</Button>
                    <Popconfirm title="Xóa danh mục này?" onConfirm={() => handleDelete(r.category_id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div className="admin-page-header">
                <Title level={2}>📁 Quản lý danh mục</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} className="admin-btn-primary">
                    Thêm danh mục
                </Button>
            </div>

            <Table dataSource={categories} columns={columns} loading={loading} rowKey="category_id" />

            <Modal
                title={editingRecord ? 'Cập nhật danh mục' : 'Thêm danh mục'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item label="Tên danh mục" name="category_name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <div className="admin-form-actions">
                        <Button onClick={() => setModalVisible(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={saving} className="admin-btn-primary">
                            {editingRecord ? 'Cập nhật' : 'Thêm'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminCategories;
