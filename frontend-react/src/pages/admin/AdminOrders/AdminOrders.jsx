import React, { useState, useEffect } from 'react';
import { Table, Tag, Select, Typography, message } from 'antd';
import { orderService } from '../../../services/orderService';
import '../Admin.css';

const { Title } = Typography;
const { Option } = Select;

const STATUS_MAP = {
    0: { label: 'Chờ xác nhận', color: 'default' },
    1: { label: 'Đang xử lý', color: 'processing' },
    2: { label: 'Đang giao hàng', color: 'warning' },
    3: { label: 'Hoàn thành', color: 'success' },
    4: { label: 'Đã hủy', color: 'error' },
};

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await orderService.getAll();
            setOrders(data || []);
        } catch { message.error('Lỗi tải đơn hàng'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleStatusChange = async (orderId, status) => {
        try {
            await orderService.updateStatus(orderId, status);
            message.success('Cập nhật trạng thái thành công');
            fetchData();
        } catch { message.error('Cập nhật thất bại'); }
    };

    const columns = [
        {
            title: 'Mã đơn', key: 'mahang',
            render: (_, r) => <strong>#{r.mahang}</strong>
        },
        { title: 'Khách hàng', dataIndex: 'customer_name' },
        { title: 'Số điện thoại', dataIndex: 'customer_phone' },
        { title: 'Sản phẩm', dataIndex: 'product_name', ellipsis: true },
        { title: 'Số lượng', dataIndex: 'soluong' },
        {
            title: 'Tổng tiền', dataIndex: 'tongDoanhThu',
            render: v => <span className="admin-price-discount">{Number(v).toLocaleString('vi-VN')}đ</span>
        },
        {
            title: 'Ngày đặt', dataIndex: 'ngayDatHang',
            render: d => d ? new Date(d).toLocaleDateString('vi-VN') : '--'
        },
        {
            title: 'Địa chỉ', dataIndex: 'customer_address', ellipsis: true
        },
        {
            title: 'Trạng thái', dataIndex: 'tinhtrang',
            render: (status, record) => (
                <Select
                    value={Number(status)}
                    style={{ width: 160 }}
                    onChange={(val) => handleStatusChange(record.donhang_id, val)}
                >
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <Option key={k} value={Number(k)}>
                            <Tag color={v.color}>{v.label}</Tag>
                        </Option>
                    ))}
                </Select>
            )
        }
    ];

    return (
        <div>
            <Title level={2}>📋 Quản lý đơn hàng</Title>
            <Table dataSource={orders} columns={columns} loading={loading} rowKey="donhang_id" scroll={{ x: 1200 }} />
        </div>
    );
};

export default AdminOrders;
