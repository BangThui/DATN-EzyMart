import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Select, Typography, message, Modal, Tooltip, Descriptions, Button, Input, Space, Row, Col, Popconfirm } from 'antd';
import { EyeOutlined, SearchOutlined, ClockCircleOutlined, ShopOutlined } from '@ant-design/icons';
import { orderService } from '../../../services/orderService';
import { formatCurrency } from '../../../utils';
import { getImageUrl } from '../../../utils/imageHelper';
import { useSocket } from '../../../context/SocketContext';
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

const PICKUP_STATUS_MAP = {
    'none': { label: 'Không áp dụng', color: 'default' },
    'waiting': { label: 'Đang chuẩn bị', color: 'orange' },
    'prepared': { label: 'Đã soạn xong', color: 'blue' },
    'received': { label: 'Đã giao khách', color: 'green' },
};

// Tiếp theo là bước chuyển trạng thái pickup hợp lệ
const PICKUP_NEXT_STATUS = {
    'waiting': 'prepared',
    'prepared': 'received',
};
const PICKUP_NEXT_LABEL = {
    'waiting': 'Đã soạn xong →',
    'prepared': 'Giao cho khách →',
};


const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterSearch, setFilterSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMethod, setFilterMethod] = useState('all');
    const { socket } = useSocket();

    const fetchData = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const data = await orderService.getAll(params);
            setOrders(data || []);
        } catch { 
            message.error('Lỗi tải đơn hàng'); 
        } finally { 
            setLoading(false); 
        }
    }, []);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const handleFilter = (overrides = {}) => {
        const params = {};
        const search = overrides.search !== undefined ? overrides.search : filterSearch;
        const status = overrides.status !== undefined ? overrides.status : filterStatus;
        const method = overrides.method !== undefined ? overrides.method : filterMethod;
        if (search && search.trim()) params.search = search.trim();
        if (status !== 'all') params.status = status;
        if (method !== 'all') params.method = method;
        fetchData(params);
    };

    const handleReset = () => {
        setFilterSearch('');
        setFilterStatus('all');
        setFilterMethod('all');
        fetchData();
    };



    // Lắng nghe socket: đơn hàng mới
    useEffect(() => {
        if (!socket) return;

        const handleNewOrder = (data) => {
            // Làm mới danh sách
            fetchData();
        };

        socket.on('new_order_alert', handleNewOrder);
        return () => socket.off('new_order_alert', handleNewOrder);
    }, [socket, fetchData]);

    // Lắng nghe socket: cập nhật trạng thái đơn hàng (từ khách hàng hoặc admin khác)
    useEffect(() => {
        if (!socket) return;

        const handleStatusUpdate = (data) => {
            // Cập nhật lại danh sách đơn hàng
            fetchData();

            // Nếu modal chi tiết đang mở đúng đơn hàng này, cập nhật trạng thái hiển thị
            setSelectedOrder(prev => {
                if (prev && (prev.mahang === data.order_id || prev.donhang_id === data.order_id)) {
                    return { ...prev, order_status: data.order_status };
                }
                return prev;
            });
        };

        socket.on('order_status_updated', handleStatusUpdate);
        return () => socket.off('order_status_updated', handleStatusUpdate);
    }, [socket, fetchData]);

    // Lắng nghe socket: cập nhật pickup_status real-time
    useEffect(() => {
        if (!socket) return;
        const handlePickupUpdate = (data) => {
            // Cập nhật pickup_status (cột Phương thức giao)
            setOrders(prev => prev.map(o =>
                (o.mahang === data.order_id || o.donhang_id === data.order_id)
                    ? { ...o, pickup_status: data.pickup_status }
                    : o
            ));
            setSelectedOrder(prev => {
                if (prev && (prev.mahang === data.order_id || prev.donhang_id === data.order_id)) {
                    return { ...prev, pickup_status: data.pickup_status };
                }
                return prev;
            });
        };
        socket.on('pickup_status_updated', handlePickupUpdate);
        return () => socket.off('pickup_status_updated', handlePickupUpdate);
    }, [socket]);



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

    // Xử lý cập nhật pickup_status của đơn Click & Collect
    // prepared  → order_status = 'processing' (Chờ đến lấy)
    // received  → order_status = 'completed'  (Hoàn thành) + COD paid
    const handlePickupStatusChange = async (orderId, newPickupStatus) => {
        try {
            const res = await orderService.updatePickupStatus(orderId, newPickupStatus);
            const { pickup_status, order_status, was_prepared, was_completed } = res;

            // Thông báo phù hợp với hành động
            if (was_completed) {
                message.success('Đã giao hàng cho khách. Đơn hàng hoàn thành!');
            } else if (was_prepared) {
                message.success('Đã soạn xong hàng. Khách hàng sẽ đến lấy!');
            } else {
                message.success('Cập nhật trạng thái chuẩn bị hàng thành công');
            }

            // Cập nhật local state đồng thời cả 2 cột:
            //   pickup_status → cột "Phương thức giao"
            //   order_status  → cột "Trạng thái" (khi prepared hoặc received)
            const shouldSyncOrderStatus = was_prepared || was_completed;
            setOrders(prev => prev.map(o => {
                if (o.mahang === orderId || o.donhang_id === orderId) {
                    return {
                        ...o,
                        pickup_status,
                        ...(shouldSyncOrderStatus ? { order_status } : {}),
                    };
                }
                return o;
            }));

            if (selectedOrder && (selectedOrder.mahang === orderId || selectedOrder.donhang_id === orderId)) {
                setSelectedOrder(prev => ({
                    ...prev,
                    pickup_status,
                    ...(shouldSyncOrderStatus ? { order_status } : {}),
                }));
            }
        } catch (err) {
            message.error(err?.response?.data?.error || 'Cập nhật thất bại');
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
        if (order.product_id || order.order_item_id) {
            acc[key].products.push({
                ...order,
                key: `${key}_${order.product_name}_${Math.random()}`,
            });
        }
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
            title: 'Thanh toán', dataIndex: 'payment_method',
            render: p => {
                const isTransfer = p === 'BANK' || p === 'MOMO' || p === 'VNPAY' || p === 'PAYPAL' || p === 'paypal' || p === 'Chuyển khoản' || p === '1' || p === 1;
                let displayText = p || 'COD';
                let color = isTransfer ? 'blue' : 'green';
                if (p === 'BANK') {
                    displayText = 'Thanh toán ATM';
                } else if (p === 'MOMO') {
                    displayText = 'Ví MoMo';
                    color = 'magenta';
                } else if (p === 'VNPAY') {
                    displayText = 'Cổng VNPAY';
                    color = 'volcano';
                } else if (p === 'PAYPAL' || p === 'paypal') {
                    displayText = 'PayPal';
                    color = 'purple';
                }
                return <Tag color={color}>{displayText}</Tag>;
            }
        },
        {
            title: 'Ngày đặt', dataIndex: 'ngayDatHang',
            render: d => d ? new Date(d).toLocaleDateString('vi-VN') : '--'
        },
        {
            title: 'Phương thức giao', key: 'shipping_info',
            width: 220,
            render: (_, record) => {
                if (record.shipping_method === 'pickup') {
                    const pickupStatus = record.pickup_status || 'waiting';
                    const nextStatus = PICKUP_NEXT_STATUS[pickupStatus];
                    const pickupTime = record.pickup_time
                        ? new Date(record.pickup_time).toLocaleString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : '--';
                    return (
                        <Space direction="vertical" size={4}>
                            <Tag color="purple" icon={<ShopOutlined />} className="admin-pickup-tag">Nhận tại quầy</Tag>
                            <Space size={4}>
                                <ClockCircleOutlined className="admin-pickup-clock-icon" />
                                <span className="admin-pickup-time">{pickupTime}</span>
                            </Space>
                            <Tag color={PICKUP_STATUS_MAP[pickupStatus]?.color || 'default'} className="admin-pickup-status-tag">
                                {PICKUP_STATUS_MAP[pickupStatus]?.label}
                            </Tag>
                            {/* Nút chuyển trạng thái tiếp theo */}
                            {nextStatus && pickupStatus !== 'received' && (
                                <Popconfirm
                                    title={`Xác nhận: ${PICKUP_NEXT_LABEL[pickupStatus]}?`}
                                    onConfirm={() => handlePickupStatusChange(record.mahang || record.donhang_id, nextStatus)}
                                    okText="Xác nhận"
                                    cancelText="Hủy"
                                >
                                    <Button
                                        size="small"
                                        type="default"
                                        onClick={(e) => e.stopPropagation()}
                                        className="admin-btn-pickup-action"
                                    >
                                        {PICKUP_NEXT_LABEL[pickupStatus]}
                                    </Button>
                                </Popconfirm>
                            )}
                            {pickupStatus === 'received' && (
                                <Tag color="success" className="admin-pickup-completed-tag">✓ Hoàn tất</Tag>
                            )}
                        </Space>
                    );
                }
                return (
                    <Space direction="vertical" size={4}>
                        <Tag color="cyan" className="admin-delivery-tag">🚚 Giao tận nơi</Tag>
                        <span className="admin-delivery-address">
                            {record.customer_address || '--'}
                        </span>
                    </Space>
                );
            }
        },
        {
            title: 'Trạng thái', dataIndex: 'order_status',
            render: (status, record) => {
                const currentStatus = status || 'pending';
                const isPaypal = record.payment_method === 'PAYPAL' || record.payment_method === 'paypal';
                return (
                    <Space direction="vertical" size={2}>
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
                        {isPaypal && currentStatus !== 'pending' && currentStatus !== 'cancelled' && <Tag color="purple" style={{ fontSize: '11px', margin: 0, textAlign: 'center', width: 140 }}>Đã thanh toán qua PayPal</Tag>}
                        {isPaypal && (currentStatus === 'pending' || currentStatus === 'cancelled') && <Tag color="default" style={{ fontSize: '11px', margin: 0, textAlign: 'center', width: 140 }}>Chưa thanh toán PayPal</Tag>}
                    </Space>
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
            title: 'Ảnh', dataIndex: 'product_image', align: 'center', width: 80,
            render: img => {
                const src = img ? getImageUrl(img) : '/placeholder.png';
                return <img src={src} alt="thumb" className="admin-img-cell" style={{width: 50, height: 50, border: '1px solid #f0f0f0', objectFit: 'cover'}} onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }} />;
            }
        },
        { 
            title: 'Tên sản phẩm', dataIndex: 'product_name',
            render: (text, record) => record.variant_name ? `${text} - ${record.variant_name}` : text
        },
        { title: 'Số lượng', dataIndex: 'soluong', align: 'center' },
        { 
            title: 'Đơn giá', key: 'dongia', 
            render: (_, r) => formatCurrency(r.variant_price || r.dongia || r.giaban || r.price || 0) 
        },
        { 
            title: 'Thành tiền', key: 'total',
            render: (_, r) => <strong style={{ color: '#cf1322' }}>{formatCurrency(r.soluong * (r.variant_price || r.dongia || r.giaban || r.price || 0))}</strong>
        }
    ];

    return (
        <div>
            <Title level={2}>📋 Quản lý đơn hàng</Title>

            {/* Filter Bar */}
            <div style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={10} md={8}>
                        <Input.Search
                            id="order-search-input"
                            placeholder="Tìm mã đơn, số điện thoại..."
                            allowClear
                            prefix={<SearchOutlined />}
                            value={filterSearch}
                            onChange={e => setFilterSearch(e.target.value)}
                            onSearch={val => {
                                setFilterSearch(val);
                                handleFilter({ search: val });
                            }}
                        />
                    </Col>
                    <Col xs={24} sm={7} md={5}>
                        <Select
                            id="order-status-filter"
                            style={{ width: '100%' }}
                            value={filterStatus}
                            onChange={val => {
                                setFilterStatus(val);
                                handleFilter({ status: val });
                            }}
                        >
                            <Option value="all">Tất cả trạng thái</Option>
                            <Option value="pending">Chờ xử lý</Option>
                            <Option value="confirmed">Đã xác nhận</Option>
                            <Option value="shipping">Đang giao</Option>
                            <Option value="completed">Đã hoàn thành</Option>
                            <Option value="cancelled">Đã hủy</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={7} md={5}>
                        <Select
                            id="order-payment-filter"
                            style={{ width: '100%' }}
                            value={filterMethod}
                            onChange={val => {
                                setFilterMethod(val);
                                handleFilter({ method: val });
                            }}
                        >
                            <Option value="all">Tất cả thanh toán</Option>
                            <Option value="COD">COD</Option>
                            <Option value="BANK">Chuyển khoản (ATM)</Option>
                            <Option value="MOMO">Ví MoMo</Option>
                            <Option value="VNPAY">Cổng VNPAY</Option>
                            <Option value="PAYPAL">Cổng PayPal</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={24} md={6}>
                        <Space>
                            <Button onClick={handleReset}>Xóa bộ lọc</Button>
                        </Space>
                    </Col>
                </Row>
            </div>
            <Table 
                dataSource={groupedOrders} 
                columns={columns} 
                loading={loading} 
                rowKey={(record) => record.donhang_id || record.mahang} 
                scroll={{ x: 1200 }} 
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    locale: { items_per_page: '/ trang' },
                    showTotal: (total) => `Tổng ${total} đơn hàng`,
                }}
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
                                {selectedOrder.shipping_method === 'pickup'
                                    ? <Tag color="purple" icon={<ShopOutlined />}>Nhận tại cửa hàng (Click &amp; Collect)</Tag>
                                    : selectedOrder.customer_address
                                }
                            </Descriptions.Item>
                            {selectedOrder.shipping_method === 'pickup' && (
                                <>
                                    <Descriptions.Item label="Giờ hẹn đến lấy" span={1}>
                                        <Space>
                                            <ClockCircleOutlined style={{ color: '#fa8c16' }} />
                                            <strong style={{ color: '#d46b08' }}>
                                                {selectedOrder.pickup_time
                                                    ? new Date(selectedOrder.pickup_time).toLocaleString('vi-VN', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                      })
                                                    : '--'
                                                }
                                            </strong>
                                        </Space>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Trạng thái cẩm hàng" span={1}>
                                        <Space wrap>
                                            <Tag color={PICKUP_STATUS_MAP[selectedOrder.pickup_status || 'waiting']?.color}>
                                                {PICKUP_STATUS_MAP[selectedOrder.pickup_status || 'waiting']?.label}
                                            </Tag>
                                            {/* Dropdown Select để admin có thể đổi trạng thái linh hoạt */}
                                            {selectedOrder.pickup_status !== 'received' && (
                                                <Select
                                                    size="small"
                                                    value={selectedOrder.pickup_status || 'waiting'}
                                                    style={{ width: 160 }}
                                                    onChange={(val) => handlePickupStatusChange(selectedOrder.mahang || selectedOrder.donhang_id, val)}
                                                >
                                                    <Option value="waiting">Đang chuẩn bị</Option>
                                                    <Option value="prepared">Đã soạn xong</Option>
                                                    <Option value="received">Đã giao khách</Option>
                                                </Select>
                                            )}
                                        </Space>
                                    </Descriptions.Item>
                                </>
                            )}
                            <Descriptions.Item label="Ghi chú từ khách hàng" span={2}>
                                {selectedOrder.note ? selectedOrder.note : <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>(Không có ghi chú)</span>}
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
