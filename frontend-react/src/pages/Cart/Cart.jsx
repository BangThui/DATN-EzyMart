import React, { useState, useEffect } from 'react';
import { Table, Button, InputNumber, Typography, Space, Divider, Empty, message, Tag } from 'antd';
import { DeleteOutlined, ShoppingOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';
import './Cart.css';

const { Title, Text } = Typography;
const IMAGE_BASE = 'http://localhost:5000/images/';

const Cart = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchCart = async () => {
        try {
            setLoading(true);
            const data = await cartService.getCart(user?.user_id);
            setCartItems(data || []);
        } catch {
            message.error('Lỗi tải giỏ hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCart(); }, [user]);

    const handleQuantityChange = async (cart_id, quantity) => {
        try {
            setUpdating(true);
            await cartService.updateItem(cart_id, quantity);
            await fetchCart();
        } catch {
            message.error('Lỗi cập nhật số lượng');
        } finally {
            setUpdating(false);
        }
    };

    const handleRemove = async (cart_id) => {
        try {
            await cartService.removeItem(cart_id);
            message.success('Đã xóa sản phẩm');
            fetchCart();
        } catch {
            message.error('Lỗi xóa sản phẩm');
        }
    };

    const getItemPrice = (item) => {
         return (item.variant_discount && Number(item.variant_discount) > 0 && Number(item.variant_discount) < Number(item.variant_price)) ? item.variant_discount : item.variant_price;
    };

    const total = cartItems.reduce((sum, item) => sum + getItemPrice(item) * item.product_quantity, 0);

    const columns = [
        {
            title: 'Sản phẩm',
            key: 'product',
            render: (_, record) => (
                <Space>
                    <img
                        src={IMAGE_BASE + record.product_image}
                        alt={record.product_name}
                        className="cart-img"
                        onError={e => { e.target.src = '/placeholder.png'; }}
                    />
                    <div>
                        <Text strong>{record.product_name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.variant_name}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Đơn giá',
            key: 'price',
            render: (_, record) => <Text type="danger">{Number(getItemPrice(record) || 0).toLocaleString('vi-VN')}vnd</Text>
        },
        {
            title: 'Số lượng',
            key: 'quantity',
            render: (_, record) => (
                <InputNumber
                    min={1}
                    max={99}
                    value={record.product_quantity}
                    onChange={(val) => handleQuantityChange(record.cart_id, val)}
                    disabled={updating}
                />
            )
        },
        {
            title: 'Thành tiền',
            key: 'subtotal',
            render: (_, record) => (
                <Text strong className="cart-subtotal-price">
                    {Number(getItemPrice(record) * record.product_quantity).toLocaleString('vi-VN')}vnd
                </Text>
            )
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button danger icon={<DeleteOutlined />} onClick={() => handleRemove(record.cart_id)} type="text" />
            )
        }
    ];

    if (!loading && cartItems.length === 0) {
        return (
            <div className="cart-empty-wrap">
                <Empty description="Giỏ hàng trống" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                <Link to="/"><Button type="primary" className="cart-empty-btn" icon={<ShoppingOutlined />}>Tiếp tục mua sắm</Button></Link>
            </div>
        );
    }

    return (
        <div className="cart-page-wrap">
            <Title level={2}>🛒 Giỏ hàng của bạn</Title>

            <Table
                dataSource={cartItems}
                columns={columns}
                rowKey="cart_id"
                loading={loading}
                pagination={false}
            />

            <Divider />

            <div className="cart-summary-row">
                <Link to="/">
                    <Button icon={<ShoppingOutlined />}>Tiếp tục mua sắm</Button>
                </Link>

                <div className="cart-total-block">
                    <div className="cart-total-tag-wrap">
                        <Tag color="green" className="cart-total-tag">
                            Tổng thanh toán: <strong>{Number(total || 0).toLocaleString('vi-VN')}vnd</strong>
                        </Tag>
                    </div>
                    {user ? (
                        <Button
                            type="primary"
                            size="large"
                            icon={<ArrowRightOutlined />}
                            onClick={() => navigate('/checkout')}
                            disabled={cartItems.length === 0}
                            className="cart-checkout-btn"
                        >
                            Thanh toán
                        </Button>
                    ) : (
                        <Text type="warning">Vui lòng đăng nhập để thanh toán</Text>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Cart;
