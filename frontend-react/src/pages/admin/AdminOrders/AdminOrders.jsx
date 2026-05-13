import React, { useState, useEffect } from 'react';
import { Table, Tag, Select, Typography, message, Modal, Tooltip, Descriptions, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { orderService } from '../../../services/orderService';
import { formatCurrency } from '../../../utils';
import '../Admin.css';

const { Title } = Typography;
const { Option } = Select;

const STATUS_MAP = {
    'pending': { label: 'Chờ xác nhận', color: 'default' },
    'confirmed': { label: 'Đang xử lý', color: 'processing' },
    'shipping': { label: 'Đang giao hàng', color: 'warning' },
    'completed': { label: 'Hoàn thành', color: 'success' },
    'cancelled': { label: 'Đã hủy', color: 'error' },
};

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await orderService.getAll();
            setOrders(data || []);
        } catch { 
            message.error('Lỗi tải đơn hàng'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { 
        fetchData(); 
    }, []);

    const handleStatusChange = async (orderId, status) => {
        try {
            await orderService.updateStatus(orderId, status);
            message.success('Cập nhật trạng thái thành công');
            fetchData();
            // Cập nhật lại state của modal nếu nó đang mở
            if (selectedOrder && (selectedOrder.mahang === orderId || selectedOrder.donhang_id === orderId)) {
                setSelectedOrder({ ...selectedOrder, order_status: status });
            }
        } catch { 
            message.error('Cập nhật thất bại'); 
        }
    };

    // 1. Gộp đơn hàng theo donhang_id
    const groupedOrders = Object.values(orders.reduce((acc, order) => {
        const key = order.donhang_id || order.mahang;
        if (!acc[key]) {
            acc[key] = {
                ...order,
                products: []
            };
        }
        acc[key].products.push({
            ...order,
            key: `${key}_${order.product_name}_${Math.random()}`,
        });
        return acc;
    }, {})).sort((a, b) => new Date(b.ngayDatHang) - new Date(a.ngayDatHang));
    const canChangeStatus = (current, next) => {
        if (current === next) return true;
        if (current === 'completed' || current === 'cancelled') return false;
        
        if (current === 'pending') return next === 'confirmed' || next === 'cancelled';
        if (current === 'confirmed') return next === 'shipping' || next === 'cancelled';
        if (current === 'shipping') return next === 'completed';
        
        return false;
    };

    const columns = [
        {
            title: 'Mã đơn', key: 'mahang',
            render: (_, r) => <strong>#{r.mahang}</strong>
        },
        { title: 'Khách hàng', dataIndex: 'customer_name' },
        { title: 'Số điện thoại', dataIndex: 'customer_phone' },
        {
            title: 'Tổng tiền', dataIndex: 'tongDoanhThu',
            render: v => <span className="admin-price-discount">{formatCurrency(v)}</span>
        },
        {
            title: 'Ngày đặt', dataIndex: 'ngayDatHang',
            render: d => d ? new Date(d).toLocaleDateString('vi-VN') : '--'
        },
        {
            title: 'Địa chỉ', dataIndex: 'customer_address', ellipsis: true
        },
        {
            title: 'Trạng thái', dataIndex: 'order_status',
            render: (status, record) => {
                const currentStatus = status || 'pending';
                return (
                    <Select
                        value={currentStatus}
                        className={`select-status-${currentStatus}`}
                        style={{ width: 140 }}
                        onChange={(val) => handleStatusChange(record.mahang || record.donhang_id, val)}
                        onClick={(e) => e.stopPropagation()} 
                    >
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                            <Option key={k} value={k} disabled={!canChangeStatus(currentStatus, k)}>
                                <Tag className="custom-status-tag" color={v.color}>{v.label}</Tag>
                            </Option>
                        ))}
                    </Select>
                );
            }
        },
        {
            title: 'Thao tác', key: 'action', align: 'center',
            render: (_, record) => (
                <Tooltip title="Xem chi tiết đơn hàng">
                    <Button 
                        type="text" 
                        icon={<EyeOutlined style={{ color: '#1890ff', fontSize: 18 }} />} 
                        onClick={() => {
                            setSelectedOrder(record);
                            setIsModalVisible(true);
                        }}
                    />
                </Tooltip>
            )
        }
    ];

    const productColumns = [
        { 
            title: 'Ảnh', dataIndex: 'hinhanh', align: 'center', width: 80,
            render: img => {
                const src = img ? (img.startsWith('http') ? img : `http://localhost:3000${img}`) : '/placeholder.png';
                return <img src={src} alt="thumb" className="admin-img-cell" style={{width: 50, height: 50, border: '1px solid #f0f0f0'}} onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }} />;
            }
        },
        { title: 'Tên sản phẩm', dataIndex: 'product_name' },
        { title: 'Số lượng', dataIndex: 'soluong', align: 'center' },
        { 
            title: 'Đơn giá', key: 'dongia', 
            render: (_, r) => formatCurrency(r.dongia || r.giaban || r.price || 0) 
        },
        { 
            title: 'Thành tiền', key: 'total',
            render: (_, r) => <strong style={{ color: '#cf1322' }}>{formatCurrency(r.soluong * (r.dongia || r.giaban || r.price || 0))}</strong>
        }
    ];

    return (
        <div>
            <Title level={2}>📋 Quản lý đơn hàng</Title>
            <Table 
                dataSource={groupedOrders} 
                columns={columns} 
                loading={loading} 
                rowKey={(record) => record.donhang_id || record.mahang} 
                scroll={{ x: 1200 }} 
            />

            <Modal
                title={<span style={{ fontSize: 20 }}>Chi tiết đơn hàng <strong>#{selectedOrder?.mahang}</strong></span>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={900}
                centered
            >
                {selectedOrder && (
                    <>
                        <Title level={5} style={{ marginTop: 16, color: '#1890ff' }}>1. Thông tin khách hàng</Title>
                        <Descriptions bordered column={2} size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
                            <Descriptions.Item label="Khách hàng"><strong>{selectedOrder.customer_name}</strong></Descriptions.Item>
                            <Descriptions.Item label="Số điện thoại">{selectedOrder.customer_phone}</Descriptions.Item>
                            <Descriptions.Item label="Ngày đặt">
                                {selectedOrder.ngayDatHang ? new Date(selectedOrder.ngayDatHang).toLocaleDateString('vi-VN') : '--'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag className="custom-status-tag" color={STATUS_MAP[selectedOrder.order_status || 'pending']?.color} style={{ margin: 0 }}>
                                    {STATUS_MAP[selectedOrder.order_status || 'pending']?.label}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Địa chỉ chi tiết" span={2}>
                                {selectedOrder.customer_address}
                            </Descriptions.Item>
                        </Descriptions>

                        <Title level={5} style={{ color: '#1890ff' }}>2. Danh sách sản phẩm</Title>
                        <Table 
                            dataSource={selectedOrder.products} 
                            columns={productColumns} 
                            pagination={false} 
                            size="small"
                            bordered
                        />
                        
                        <div style={{ textAlign: 'right', marginTop: 24, padding: '16px 24px', background: '#fff1f0', borderRadius: 8, border: '1px solid #ffa39e' }}>
                            <span style={{ fontSize: 16, marginRight: 12, fontWeight: 500, color: '#cf1322' }}>TỔNG THANH TOÁN:</span>
                            <span style={{ color: '#cf1322', fontSize: 26, fontWeight: 'bold' }}>
                                {formatCurrency(selectedOrder.tongDoanhThu)}
                            </span>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default AdminOrders;
