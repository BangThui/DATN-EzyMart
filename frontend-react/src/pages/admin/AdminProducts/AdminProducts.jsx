import React, { useState, useEffect } from 'react';
import {
    Table, Button, Modal, Form, Input, Select, InputNumber,
    Typography, Space, Popconfirm, message, Upload, Image, Row, Col
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { productService } from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import { formatCurrency } from '../../../utils';
import '../Admin.css';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const IMAGE_BASE = 'http://localhost:5000/uploads/';
const UPLOAD_BASE = 'http://localhost:5000/uploads/';

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [fileList, setFileList] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prods, cats] = await Promise.all([productService.getAll(), categoryService.getAll()]);
            setProducts(prods || []);
            setCategories(cats || []);
        } catch { message.error('Lỗi tải dữ liệu'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const openAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setFileList([]);
        setModalVisible(true);
    };

    const openEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setFileList([]);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await productService.delete(id);
            message.success('Đã xóa sản phẩm');
            fetchData();
        } catch { message.error('Xóa thất bại'); }
    };

    const handleSubmit = async (values) => {
        setSaving(true);
        try {
            const formData = new FormData();
            Object.keys(values).forEach(k => { 
                if (k === 'variants') {
                    if (values[k]) formData.append('variants', JSON.stringify(values[k]));
                } else if (values[k] !== undefined) { 
                    formData.append(k, values[k]); 
                } 
            });
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('image', fileList[0].originFileObj);
            }

            if (editingRecord) {
                await productService.update(editingRecord.product_id, formData);
                message.success('Cập nhật thành công');
            } else {
                await productService.create(formData);
                message.success('Thêm sản phẩm thành công');
            }
            setModalVisible(false);
            fetchData();
        } catch { message.error('Thao tác thất bại'); }
        finally { setSaving(false); }
    };

    const columns = [
        {
            title: 'Ảnh', dataIndex: 'product_image',
            render: img => <Image src={IMAGE_BASE + img} fallback={UPLOAD_BASE + img} width={50} height={50} className="admin-img-cell" />
        },
        { title: 'Tên sản phẩm', dataIndex: 'product_name', ellipsis: true },
        {
            title: 'Danh mục', dataIndex: 'category_name',
            render: (name, record) => name || categories.find(c => c.category_id === record.category_id)?.category_name || '--'
        },
        { 
            title: 'Số lượng', 
            render: (_, record) => {
                if (record.variants && record.variants.length > 0) {
                    return record.variants.reduce((sum, v) => sum + Number(v.variant_quantity || 0), 0);
                }
                const total = Number(record.total_quantity);
                return !isNaN(total) && total > 0 ? total : (Number(record.product_quantity) || 0);
            }
        },
        { 
            title: 'Giá', 
            render: (_, record) => {
                if (record.variants && record.variants.length > 0) {
                    const prices = record.variants.map(v => Number(v.variant_price || 0));
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    if (min === max) {
                        return formatCurrency(min);
                    }
                    return `${formatCurrency(min)} - ${formatCurrency(max)}`;
                }
                const minPrice = Number(record.min_price);
                const maxPrice = Number(record.max_price);
                if (!isNaN(minPrice) && !isNaN(maxPrice) && maxPrice > 0) {
                    if (minPrice === maxPrice) return formatCurrency(minPrice);
                    return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
                }
                return formatCurrency(record.product_price);
            }
        },
        { 
            title: 'Giá KM', 
            render: (_, record) => {
                if (record.variants && record.variants.length > 0) {
                    const discounts = record.variants.map(v => Number(v.variant_discount || 0));
                    const min = Math.min(...discounts);
                    const max = Math.max(...discounts);
                    if (max > 0) {
                        if (min === max) return <span className="admin-price-discount">{formatCurrency(min)}</span>;
                        return <span className="admin-price-discount">{formatCurrency(min)} - {formatCurrency(max)}</span>;
                    }
                }
                const discount = Number(record.product_discount || 0);
                return <span className="admin-price-discount">{discount ? formatCurrency(discount) : formatCurrency(0)}</span>;
            }
        },
        {
            title: 'Thao tác',
            render: (_, r) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)}>Sửa</Button>
                    <Popconfirm title="Xóa sản phẩm này?" onConfirm={() => handleDelete(r.product_id)} okText="Xóa" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div className="admin-page-header">
                <Title level={2}>🛍️ Quản lý sản phẩm</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} className="admin-btn-primary">
                    Thêm sản phẩm
                </Button>
            </div>

            <Table dataSource={products} columns={columns} loading={loading} rowKey="product_id" />

            <Modal
                title={editingRecord ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={900}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item label="Tên sản phẩm" name="product_name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="Hình ảnh" name="image">
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onChange={({ fileList }) => setFileList(fileList)}
                            beforeUpload={() => false}
                            maxCount={1}
                        >
                            {fileList.length === 0 && <div><UploadOutlined /><div>Tải ảnh</div></div>}
                        </Upload>
                        {editingRecord?.product_image && fileList.length === 0 && (
                            <Image src={IMAGE_BASE + editingRecord.product_image} width={80} className="admin-preview-img" />
                        )}
                    </Form.Item>
                    <Typography.Text strong>Cấu hình biến thể (Variants)</Typography.Text>
                    <Form.List name="variants">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8, alignItems: 'start' }} align="baseline">
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'variant_id']}
                                            hidden
                                        >
                                            <Input />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'variant_name']}
                                            rules={[{ required: true, message: 'Nhập tên' }]}
                                        >
                                            <Input placeholder="Tên biến thể (VD: Gói 65g)" />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'variant_price']}
                                            rules={[{ required: true, message: 'Nhập giá' }]}
                                        >
                                            <InputNumber placeholder="Giá gốc" min={0} style={{ width: 120 }} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'variant_discount']}
                                        >
                                            <InputNumber placeholder="Giá KM" min={0} style={{ width: 120 }} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'variant_quantity']}
                                        >
                                            <InputNumber placeholder="Số lượng" min={0} style={{ width: 100 }} />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'sku']}
                                        >
                                            <Input placeholder="SKU / Mã kho" style={{ width: 120 }} />
                                        </Form.Item>
                                        <Button 
                                            type="text" 
                                            icon={<DeleteOutlined />} 
                                            danger 
                                            onClick={() => remove(name)} 
                                        />
                                    </Space>
                                ))}
                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Thêm biến thể
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                    <Form.Item label="Danh mục" name="category_id" rules={[{ required: true }]}>
                        <Select placeholder="Chọn danh mục">
                            {categories.map(c => <Option key={c.category_id} value={c.category_id}>{c.category_name}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item label="Mô tả" name="product_description">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item label="Chi tiết" name="product_details">
                        <TextArea rows={4} />
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

export default AdminProducts;
