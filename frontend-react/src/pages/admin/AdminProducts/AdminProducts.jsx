import React, { useState, useEffect } from 'react';
import {
    Table, Button, Modal, Form, Input, Select, InputNumber,
    Typography, Space, Popconfirm, message, Upload, Image, Row, Col, Tag, Tooltip, Badge, TreeSelect
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
    MinusCircleOutlined, RestOutlined, UndoOutlined, PictureOutlined
} from '@ant-design/icons';
import { productService } from '../../../services/productService';
import { categoryService } from '../../../services/categoryService';
import { brandService } from '../../../services/brandService';
import { formatCurrency } from '../../../utils';
import '../Admin.css';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const UPLOAD_BASE = 'http://localhost:5000/uploads/';
const IMAGE_BASE = '/images/';

// Lấy src đầy đủ cho ảnh (hỗ trợ cả uploads và images/)
const getImgSrc = (filename) => {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;
    return `${UPLOAD_BASE}${filename}`;
};

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    // Danh sách ảnh tổng hợp (cũ + mới)
    const [fileList, setFileList] = useState([]);

    const [trashVisible, setTrashVisible] = useState(false);
    const [trashProducts, setTrashProducts] = useState([]);
    const [loadingTrash, setLoadingTrash] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prods, cats, brs] = await Promise.all([
                productService.getAll({ admin: true }), 
                categoryService.getAll(),
                brandService.getAll()
            ]);
            setProducts(prods || []);
            setCategories(cats || []);
            setBrands(brs || []);
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
        const initialFiles = [];
        if (record.product_image) {
            initialFiles.push({
                uid: 'main_img',
                name: record.product_image,
                status: 'done',
                url: getImgSrc(record.product_image),
                isExisting: true,
                filename: record.product_image
            });
        }
        if (record.images && record.images.length > 0) {
            record.images.forEach(img => {
                if (img.image_url !== record.product_image) {
                    initialFiles.push({
                        uid: `gallery_${img.image_id}`,
                        name: img.image_url,
                        status: 'done',
                        url: getImgSrc(img.image_url),
                        isExisting: true,
                        filename: img.image_url
                    });
                }
            });
        }
        setFileList(initialFiles);
        setModalVisible(true);
    };



    const handleSoftDelete = async (id) => {
        try {
            await productService.softDelete(id);
            message.success('Đã chuyển vào thùng rác');
            fetchData();
        } catch { message.error('Chuyển vào thùng rác thất bại'); }
    };

    const fetchTrash = async () => {
        setLoadingTrash(true);
        try {
            const data = await productService.getTrash();
            setTrashProducts(data || []);
        } catch { message.error('Lỗi tải thùng rác'); }
        finally { setLoadingTrash(false); }
    };

    const handleRestore = async (id) => {
        try {
            await productService.restore(id);
            message.success('Đã khôi phục sản phẩm');
            fetchData();
            fetchTrash();
        } catch { message.error('Khôi phục thất bại'); }
    };

    const handleHardDelete = async (id) => {
        try {
            await productService.hardDelete(id);
            message.success('Đã xóa vĩnh viễn');
            fetchTrash();
        } catch { message.error('Xóa vĩnh viễn thất bại'); }
    };

    const handleSubmit = async (values) => {
        setSaving(true);
        try {
            const formData = new FormData();

            // Append các field thông thường
            Object.keys(values).forEach(k => {
                if (k === 'variants') {
                    if (values[k]) formData.append('variants', JSON.stringify(values[k]));
                } else if (values[k] !== undefined && k !== 'images') {
                    formData.append(k, values[k]);
                }
            });

            if (!editingRecord) {
                formData.append('product_active', 1);
            }

            // Tạo final_image_order và append file mới
            const finalOrder = [];
            fileList.forEach(file => {
                if (file.isExisting) {
                    finalOrder.push(file.filename);
                } else {
                    finalOrder.push('NEW_FILE');
                    if (file.originFileObj) {
                        formData.append('images', file.originFileObj);
                    }
                }
            });
            formData.append('final_image_order', JSON.stringify(finalOrder));

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

    const handleStatusChange = async (id, currentStatus) => {
        const newStatus = (currentStatus === 1 || currentStatus === '1') ? 0 : 1;
        try {
            await productService.updateStatus(id, newStatus);
            message.success('Cập nhật trạng thái thành công');
            fetchData();
        } catch {
            message.error('Lỗi cập nhật trạng thái');
        }
    };

    const columns = [
        {
            title: 'Ảnh', dataIndex: 'product_image', width: 70,
            render: (img) => {
                return (
                    <div className="admin-img-wrapper">
                        <Image
                            src={getImgSrc(img)}
                            fallback="/placeholder.png"
                            width={50}
                            height={50}
                            className="admin-img-cell"
                        />
                    </div>
                );
            }
        },
        { title: 'Tên sản phẩm', dataIndex: 'product_name', ellipsis: true },
        {
            title: 'Danh mục', dataIndex: 'category_name',
            render: (name, record) => name || categories.find(c => c.category_id === record.category_id)?.category_name || '--'
        },
        {
            title: 'Số lượng',
            align: 'right',
            render: (_, record) => {
                if (record.variants && record.variants.length > 0) {
                    return record.variants.reduce((sum, v) => sum + Number(v.variant_quantity || 0), 0);
                }
                const total = Number(record.total_quantity);
                return !isNaN(total) && total > 0 ? total : (Number(record.product_quantity) || 0);
            }
        },
        {
            title: 'Giá bán',
            align: 'right',
            render: (_, record) => {
                if (record.variants && record.variants.length > 0) {
                    const prices = record.variants.map(v => Number(v.variant_price || 0));
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    const priceRange = min === max ? formatCurrency(min) : `${formatCurrency(min)} - ${formatCurrency(max)}`;

                    const finalPrices = record.variants.map(v => Number(v.variant_discount) > 0 ? Number(v.variant_discount) : Number(v.variant_price));
                    const minF = Math.min(...finalPrices);
                    const maxF = Math.max(...finalPrices);
                    const finalRange = minF === maxF ? formatCurrency(minF) : `${formatCurrency(minF)} - ${formatCurrency(maxF)}`;

                    const hasDiscount = record.variants.some(v => Number(v.variant_discount) > 0);

                    if (hasDiscount) {
                        return (
                            <div className="admin-price-col">
                                <Typography.Text delete type="secondary" className="admin-text-secondary-sm">{priceRange}</Typography.Text>
                                <Typography.Text type="danger" strong>{finalRange}</Typography.Text>
                            </div>
                        );
                    }
                    return <Typography.Text strong>{priceRange}</Typography.Text>;
                }

                const minPrice = Number(record.min_price);
                const maxPrice = Number(record.max_price);
                if (!isNaN(minPrice) && !isNaN(maxPrice) && maxPrice > 0) {
                    const pRange = minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
                    return <Typography.Text strong>{pRange}</Typography.Text>;
                }

                const price = Number(record.product_price || 0);
                const discount = Number(record.product_discount || 0);
                if (discount > 0 && discount < price) {
                    return (
                        <div className="admin-price-col">
                            <Typography.Text delete type="secondary" className="admin-text-secondary-sm">{formatCurrency(price)}</Typography.Text>
                            <Typography.Text type="danger" strong>{formatCurrency(discount)}</Typography.Text>
                        </div>
                    );
                }
                return <Typography.Text strong>{formatCurrency(price)}</Typography.Text>;
            }
        },
        {
            title: 'Trạng thái',
            dataIndex: 'product_active',
            align: 'center',
            render: (val, record) => {
                let statusVal = val;
                if (statusVal === undefined) statusVal = record.product_acitve;
                const isActive = (statusVal === 1 || statusVal === '1');
                return (
                    <Tag
                        color={isActive ? 'green' : 'red'}
                        className="admin-pointer"
                        onClick={() => handleStatusChange(record.product_id, statusVal)}
                    >
                        {isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                    </Tag>
                );
            }
        },
        {
            title: 'Thao tác',
            render: (_, r) => (
                <Space>
                    <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)}>Sửa</Button>
                    <Popconfirm title="Chuyển sản phẩm này vào thùng rác?" onConfirm={() => handleSoftDelete(r.product_id)} okText="Đồng ý" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const trashColumns = [
        {
            title: 'Ảnh', dataIndex: 'product_image',
            render: img => <Image src={getImgSrc(img)} fallback={`${IMAGE_BASE}${img}`} width={50} height={50} className="admin-img-cell" />
        },
        { title: 'Tên sản phẩm', dataIndex: 'product_name', ellipsis: true },
        {
            title: 'Ngày xóa', dataIndex: 'deleted_at',
            render: (val) => {
                if (!val) return '--';
                const d = new Date(val);
                const pad = (n) => n.toString().padStart(2, '0');
                return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }
        },
        {
            title: 'Thao tác',
            render: (_, r) => (
                <Space>
                    <Button icon={<UndoOutlined />} size="small" onClick={() => handleRestore(r.product_id)}>Khôi phục</Button>
                    <Popconfirm title="Xóa vĩnh viễn sản phẩm này? (Không thể hoàn tác)" onConfirm={() => handleHardDelete(r.product_id)} okText="Xóa luôn" cancelText="Hủy">
                        <Button icon={<DeleteOutlined />} size="small" danger>Xóa vĩnh viễn</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div className="admin-page-header">
                <Title level={2}>🛍️ Quản lý sản phẩm</Title>
                <Space>
                    <Button icon={<RestOutlined />} onClick={() => { setTrashVisible(true); fetchTrash(); }}>
                        Thùng rác
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} className="admin-btn-primary">
                        Thêm sản phẩm
                    </Button>
                </Space>
            </div>

            <Table dataSource={products} columns={columns} loading={loading} rowKey="product_id" />

            {/* Modal Thêm/Sửa */}
            <Modal
                title={editingRecord ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={960}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item label="Tên sản phẩm" name="product_name" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    {/* ===== Phần ảnh sản phẩm ===== */}
                    <Form.Item label={
                        <span>
                            <PictureOutlined className="admin-icon-mr" />
                            Hình ảnh sản phẩm
                            <Typography.Text type="secondary" className="admin-text-secondary-sm admin-icon-ml">
                                (Tối đa 10 ảnh, mỗi ảnh ≤ 2MB)
                            </Typography.Text>
                        </span>
                    }>
                        {/* Upload ảnh */}
                        <Upload
                            listType="picture-card"
                            fileList={fileList}
                            onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                            beforeUpload={() => false}
                            multiple
                            accept="image/*"
                            itemRender={(originNode, file, currFileList) => {
                                const index = currFileList.indexOf(file);
                                if (index === 0) {
                                    return (
                                        <Badge count="Ảnh chính" className="main-image-badge admin-badge-main">
                                            {originNode}
                                        </Badge>
                                    );
                                }
                                return originNode;
                            }}
                        >
                            {fileList.length < 10 && (
                                <div>
                                    <PlusOutlined />
                                    <div className="admin-upload-add">Thêm ảnh</div>
                                </div>
                            )}
                        </Upload>
                        {fileList.length > 0 && (
                            <Typography.Text type="secondary" className="admin-hint-text">
                                Gợi ý: Ảnh ở vị trí <b>đầu tiên</b> sẽ được chọn làm <b>ảnh đại diện chính</b>. Bạn có thể xóa ảnh đầu tiên để ảnh tiếp theo thay thế.
                            </Typography.Text>
                        )}
                    </Form.Item>

                    {/* Variants */}
                    <Typography.Text strong>Cấu hình biến thể (Variants)</Typography.Text>
                    <Form.List name="variants">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} className="admin-variant-row" align="baseline">
                                        <Form.Item {...restField} name={[name, 'variant_id']} hidden>
                                            <Input />
                                        </Form.Item>
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'variant_name']}
                                            rules={[{ required: true, message: 'Nhập tên' }]}
                                        >
                                            <Input placeholder="Tên biến thể (VD: Gói 65g)" />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'variant_price']} rules={[{ required: true, message: 'Nhập giá' }]}>
                                            <InputNumber placeholder="Giá gốc" min={0} className="admin-input-price" />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'variant_discount']}>
                                            <InputNumber placeholder="Giá KM" min={0} className="admin-input-price" />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'variant_quantity']}>
                                            <InputNumber placeholder="Số lượng" min={0} className="admin-input-qty" />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, 'sku']}>
                                            <Input placeholder="SKU / Mã kho" className="admin-input-price" />
                                        </Form.Item>
                                        <Button type="text" icon={<DeleteOutlined />} danger onClick={() => remove(name)} />
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

                    <Form.Item label="Thương hiệu" name="brand_id">
                        <Select placeholder="Chọn thương hiệu" allowClear>
                            {brands.map(b => <Option key={b.brand_id} value={b.brand_id}>{b.brand_name}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item label="Danh mục" name="category_id" rules={[{ required: true }]}>
                        <TreeSelect
                            treeData={categories
                                .filter(c => !c.parent_id)
                                .map(c => ({
                                    value: c.category_id,
                                    title: c.category_name,
                                    children: categories
                                        .filter(child => child.parent_id === c.category_id)
                                        .map(child => ({
                                            value: child.category_id,
                                            title: child.category_name
                                        }))
                                }))}
                            placeholder="Chọn danh mục"
                            treeDefaultExpandAll
                            allowClear
                        />
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

            {/* Modal Thùng rác */}
            <Modal
                title="Thùng rác - Sản phẩm đã xóa"
                open={trashVisible}
                onCancel={() => setTrashVisible(false)}
                footer={null}
                width={1000}
            >
                <Table
                    dataSource={trashProducts}
                    columns={trashColumns}
                    loading={loadingTrash}
                    rowKey="product_id"
                    locale={{ emptyText: 'Thùng rác trống' }}
                />
            </Modal>
        </div>
    );
};

export default AdminProducts;
