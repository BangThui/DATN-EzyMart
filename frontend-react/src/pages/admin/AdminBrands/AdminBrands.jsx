import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, Upload, message, Popconfirm, Image } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { brandService } from '../../../services/brandService';
import { categoryService } from '../../../services/categoryService';

const UPLOAD_BASE = 'http://localhost:5000/uploads/';

const AdminBrands = () => {
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [brandsData, categoriesData] = await Promise.all([
                brandService.getAll(),
                categoryService.getAll()
            ]);
            setBrands(Array.isArray(brandsData) ? brandsData : []);
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        } catch (error) {
            console.error('Fetch brands/categories error:', error);
            message.error('Lỗi khi tải dữ liệu!');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (record = null) => {
        setEditingBrand(record);
        if (record) {
            form.setFieldsValue({
                brand_name: record.brand_name,
                category_id: record.category_id,
            });
            if (record.brand_logo) {
                setFileList([{
                    uid: '-1',
                    name: record.brand_logo,
                    status: 'done',
                    url: `${UPLOAD_BASE}${record.brand_logo}`,
                }]);
            } else {
                setFileList([]);
            }
        } else {
            form.resetFields();
            setFileList([]);
        }
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
        form.resetFields();
        setFileList([]);
    };

    const handleDelete = async (id) => {
        try {
            await brandService.delete(id);
            message.success('Xóa thương hiệu thành công!');
            fetchData();
        } catch (error) {
            message.error('Lỗi khi xóa thương hiệu!');
        }
    };

    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const handleFinish = async (values) => {
        try {
            const formData = new FormData();
            formData.append('brand_name', values.brand_name);
            if (values.category_id) {
                formData.append('category_id', values.category_id);
            }
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('brand_logo', fileList[0].originFileObj);
            }

            if (editingBrand) {
                await brandService.update(editingBrand.brand_id, formData);
                message.success('Cập nhật thương hiệu thành công!');
            } else {
                await brandService.create(formData);
                message.success('Thêm thương hiệu mới thành công!');
            }
            handleCancel();
            fetchData();
        } catch (error) {
            message.error('Lỗi khi lưu thương hiệu!');
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'brand_id',
            key: 'brand_id',
            width: 80,
        },
        {
            title: 'Tên Thương Hiệu',
            dataIndex: 'brand_name',
            key: 'brand_name',
        },
        {
            title: 'Logo',
            dataIndex: 'brand_logo',
            key: 'brand_logo',
            render: (text) => text ? <Image src={`${UPLOAD_BASE}${text}`} alt="logo" width={50} height={50} style={{ objectFit: 'contain' }} /> : 'Không có ảnh'
        },
        {
            title: 'Danh Mục',
            dataIndex: 'category_id',
            key: 'category_id',
            render: (catId) => {
                if (!Array.isArray(categories)) return '---';
                const cat = categories.find(c => c.category_id === catId);
                return cat ? cat.category_name : '---';
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 150,
            render: (_, record) => (
                <Space size="middle">
                    <Button type="primary" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa?"
                        onConfirm={() => handleDelete(record.brand_id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24, background: '#fff', minHeight: '100%', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2>Quản lý Thương Hiệu</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
                    Thêm Thương Hiệu
                </Button>
            </div>

            <Table 
                columns={columns} 
                dataSource={brands || []} 
                rowKey="brand_id" 
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingBrand ? "Cập nhật Thương Hiệu" : "Thêm Thương Hiệu"}
                open={modalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                >
                    <Form.Item
                        name="brand_name"
                        label="Tên Thương Hiệu"
                        rules={[{ required: true, message: 'Vui lòng nhập tên thương hiệu!' }]}
                    >
                        <Input placeholder="Nhập tên thương hiệu" />
                    </Form.Item>

                    <Form.Item
                        name="category_id"
                        label="Danh Mục Liên Kết"
                    >
                        <Select placeholder="Chọn danh mục" allowClear>
                            {(categories || []).map(c => (
                                <Select.Option key={c.category_id} value={c.category_id}>
                                    {c.category_name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Logo">
                        <Upload
                            listType="picture"
                            maxCount={1}
                            fileList={fileList}
                            onChange={handleUploadChange}
                            beforeUpload={() => false}
                        >
                            <Button icon={<UploadOutlined />}>Chọn ảnh logo</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={handleCancel}>Hủy</Button>
                            <Button type="primary" htmlType="submit">
                                Lưu
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminBrands;


