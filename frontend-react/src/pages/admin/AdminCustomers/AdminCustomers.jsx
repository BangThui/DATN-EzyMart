import React, { useState, useEffect } from 'react';
import { Table, Typography, message, Tag } from 'antd';
import { userService } from '../../../services/userService';

const { Title } = Typography;

const AdminCustomers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        userService.getAllCustomers().then(data => {
            setCustomers(data || []);
            setLoading(false);
        }).catch(() => { message.error('Lỗi tải khách hàng'); setLoading(false); });
    }, []);

    const columns = [
        { title: 'ID', dataIndex: 'customer_id', width: 60 },
        { title: 'Họ tên', dataIndex: 'customer_name' },
        { title: 'Email', dataIndex: 'customer_email' },
        { title: 'Số điện thoại', dataIndex: 'customer_phone' },
        { title: 'Địa chỉ', dataIndex: 'customer_address', ellipsis: true },
        {
            title: 'Thanh toán', dataIndex: 'payments',
            render: p => <Tag color={p === '1' || p === 1 ? 'blue' : 'green'}>{p === '1' || p === 1 ? 'ATM' : 'COD'}</Tag>
        },
        { title: 'Ghi chú', dataIndex: 'customer_note', ellipsis: true },
    ];

    return (
        <div>
            <Title level={2}>👥 Danh sách khách hàng đặt hàng</Title>
            <Table dataSource={customers} columns={columns} loading={loading} rowKey="customer_id" />
        </div>
    );
};

export default AdminCustomers;
