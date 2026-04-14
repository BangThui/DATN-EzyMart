import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Empty, Button, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import './Orders.css';

const { Title, Text } = Typography;
const IMAGE_BASE = 'http://localhost:5000/uploads/';

const Orders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [grouped, setGrouped] = useState([]);

    useEffect(() => {
        if (!user?.user_code) { setLoading(false); return; }
        orderService.getByUserCode(user.user_code).then(data => {
            // Group by mahang
            const groups = {};
            (data || []).forEach(item => {
                if (!groups[item.mahang]) groups[item.mahang] = { ...item, items: [] };
                groups[item.mahang].items.push(item);
            });
            setGrouped(Object.values(groups));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [user]);

    const statusTag = (status) => {
        const map = { 0: ['Chờ xác nhận', 'default'], 1: ['Đang xử lý', 'processing'], 2: ['Đang giao', 'warning'], 3: ['Hoàn thành', 'success'] };
        const [label, color] = map[status] || ['Không rõ', 'default'];
        return <Tag color={color}>{label}</Tag>;
    };

    const columns = [
        {
            title: 'Mã đơn', dataIndex: 'mahang',
            render: mahang => <Text strong>#{mahang}</Text>
        },
        {
            title: 'Ngày đặt', dataIndex: 'ngayDatHang',
            render: date => date ? new Date(date).toLocaleDateString('vi-VN') : '--'
        },
        {
            title: 'Sản phẩm',
            render: (_, record) => (
                <div className="order-items-flex">
                    {record.items.map((item, idx) => (
                        <div key={idx} className="order-item-chip">
                            <img src={IMAGE_BASE + item.product_image} alt="" className="order-item-img" />
                            <span className="order-item-name">{item.product_name} x{item.soluong}</span>
                        </div>
                    ))}
                </div>
            )
        },
        {
            title: 'Tổng tiền', dataIndex: 'tongDoanhThu',
            render: val => <Text strong className="order-total-price">{Number(val).toLocaleString('vi-VN')}vnd</Text>
        },
        {
            title: 'Trạng thái', dataIndex: 'tinhtrang',
            render: status => statusTag(status)
        },
        {
            title: 'Chi tiết',
            render: (_, record) => <Link to={`/orders/${record.mahang}`}>Xem</Link>
        }
    ];

    if (!user) return (
        <div className="orders-not-logged-in">
            <Text>Vui lòng đăng nhập để xem đơn mua.</Text>
        </div>
    );

    if (loading) return <div className="orders-loading"><Spin size="large" /></div>;

    return (
        <div className="orders-page-wrap">
            <Title level={2}>📦 Đơn hàng của tôi</Title>
            {grouped.length === 0 ? (
                <Empty description="Chưa có đơn hàng nào">
                    <Link to="/"><Button type="primary">Mua sắm ngay</Button></Link>
                </Empty>
            ) : (
                <Table dataSource={grouped} columns={columns} rowKey="mahang" />
            )}
        </div>
    );
};

export default Orders;
