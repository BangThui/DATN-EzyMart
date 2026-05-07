import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Popconfirm, message, Select, List, Tag, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { categoryService } from '../../../services/categoryService';
import '../Admin.css';

const { Title, Text } = Typography;

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);
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

    // Chỉ lấy danh mục cha để hiện ở bảng chính
    const parentCategories = categories.filter(c => !c.parent_id);

    // Lấy danh mục con theo id cha
    const getChildren = (parentId) => categories.filter(c => c.parent_id === parentId);

    // Mở modal thêm mới (không có cha)
    const openAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalVisible(true);
    };

    // Mở modal thêm danh mục con, tự điền sẵn parent_id
    const openAddChild = (parentId) => {
        setEditingRecord(null);
        form.resetFields();
        form.setFieldsValue({ parent_id: parentId });
        setModalVisible(true);
    };

    // Mở modal sửa
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

    // Cột bảng chính (chỉ hiện danh mục cha)
    const columns = [
        { title: 'ID', dataIndex: 'category_id', width: 80 },
        { 
            title: 'Tên danh mục', 
            render: (_, r) => {
                const count = getChildren(r.category_id).length;
                return (
                    <Space size={16} align="center">
                        <span style={{ fontWeight: 600, fontSize: '15px', color: '#262626' }}>{r.category_name}</span>
                        {count > 0 && (
                            <Badge 
                                count={count} 
                                style={{ 
                                    backgroundColor: '#e6f7ff', 
                                    color: '#1890ff', 
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    boxShadow: 'none',
                                    transform: 'scale(0.85)',
                                    marginTop: '-2px'
                                }}
                            />
                        )}
                    </Space>
                );
            }
        },
        {
            title: 'Thao tác',
            width: 160,
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

    // Vùng mở rộng: Danh sách danh mục con + nút thêm con
    const expandedRowRender = (parentRecord) => {
        const children = getChildren(parentRecord.category_id);
        return (
            <div className="admin-expanded-row">
                {children.length > 0 ? (
                    <List
                        size="small"
                        dataSource={children}
                        renderItem={(child) => (
                            <List.Item
                                className="admin-child-item"
                                actions={[
                                    <Button
                                        key="edit"
                                        icon={<EditOutlined />}
                                        size="small"
                                        onClick={() => openEdit(child)}
                                    >
                                        Sửa
                                    </Button>,
                                    <Popconfirm
                                        key="del"
                                        title="Xóa danh mục con này?"
                                        onConfirm={() => handleDelete(child.category_id)}
                                        okText="Xóa"
                                        cancelText="Hủy"
                                    >
                                        <Button icon={<DeleteOutlined />} size="small" danger>
                                            Xóa
                                        </Button>
                                    </Popconfirm>
                                ]}
                            >
                                <Space align="center" size={12}>
                                    <Text type="secondary" style={{ fontSize: 12, minWidth: '40px' }}>ID: {child.category_id}</Text>
                                    <Text style={{ fontSize: 14, fontWeight: 400 }}>{child.category_name}</Text>
                                </Space>
                            </List.Item>
                        )}
                    />
                ) : (
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', padding: '8px 0' }}>
                        Chưa có danh mục con nào.
                    </Text>
                )}
                <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    size="small"
                    className="admin-add-child-btn"
                    onClick={() => openAddChild(parentRecord.category_id)}
                >
                    Thêm danh mục con
                </Button>
            </div>
        );
    };

    return (
        <div>
            <div className="admin-page-header">
                <Title level={2}>📁 Quản lý danh mục</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} className="admin-btn-primary">
                    Thêm danh mục cha
                </Button>
            </div>

            <Table
                dataSource={parentCategories}
                columns={columns}
                loading={loading}
                rowKey="category_id"
                pagination={{ pageSize: 10 }}
                expandable={{
                    expandedRowKeys,
                    onExpand: (expanded, record) => {
                        setExpandedRowKeys(
                            expanded
                                ? [...expandedRowKeys, record.category_id]
                                : expandedRowKeys.filter(k => k !== record.category_id)
                        );
                    },
                    expandedRowRender,
                    // Chỉ danh mục có con mới hiện mũi tên
                    rowExpandable: (record) => getChildren(record.category_id).length > 0,
                    // Icon mũi tên tùy chỉnh nằm ngoài cùng bên phải
                    expandIcon: ({ expanded, onExpand, record, expandable }) => {
                        if (!expandable) return null;
                        return (
                            <Button
                                type="text"
                                size="small"
                                icon={expanded ? <UpOutlined /> : <DownOutlined />}
                                onClick={(e) => onExpand(record, e)}
                            />
                        );
                    },
                    expandIconColumnIndex: columns.length, // Đẩy icon sang cột cuối cùng
                }}
            />

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
                    <Form.Item label="Danh mục cha" name="parent_id">
                        <Select allowClear placeholder="Để trống nếu là danh mục gốc">
                            {parentCategories
                                .filter(c => c.category_id !== editingRecord?.category_id)
                                .map(c => (
                                    <Select.Option key={c.category_id} value={c.category_id}>
                                        {c.category_name}
                                    </Select.Option>
                                ))}
                        </Select>
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
