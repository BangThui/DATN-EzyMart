import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Card, Typography, Divider, message, Row, Col, Alert } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils';
import './Checkout.css';

const { Title, Text } = Typography;
const { Option } = Select;
const IMAGE_BASE = 'http://localhost:5000/uploads/';

const Checkout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderedMahang, setOrderedMahang] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        if (!user) { navigate('/'); return; }
        // Điền thông tin user vào form
        form.setFieldsValue({
            name: user.user_name,
            phone: user.user_phone,
            email: user.user_email,
            address: user.user_address,
        });
        // Lấy giỏ hàng
        cartService.getCart(user.user_id).then(data => {
            setCartItems(data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [user]);

    const getItemPrice = (item) => {
        return (item.variant_discount && Number(item.variant_discount) > 0 && Number(item.variant_discount) < Number(item.variant_price)) 
             ? item.variant_discount 
             : item.variant_price;
    };

    const total = cartItems.reduce((sum, item) => sum + getItemPrice(item) * item.product_quantity, 0);

    const handleSubmit = async (values) => {
        if (cartItems.length === 0) { message.error('Giỏ hàng trống'); return; }
        setSubmitting(true);
        try {
            const res = await orderService.create({
                ...values,
                user_id: user.user_id,
                cart_items: cartItems.map(item => ({
                    product_id: item.product_id,
                    variant_id: item.variant_id,
                    variant_price: item.variant_price,
                    variant_discount: item.variant_discount,
                    product_quantity: item.product_quantity
                }))
            });
            setOrderedMahang(res.mahang);
            message.success('Đặt hàng thành công!');
        } catch (err) {
            message.error(err.response?.data?.error || 'Đặt hàng thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    if (orderedMahang) {
        return (
            <div className="checkout-success-wrap">
                <CheckCircleOutlined className="checkout-success-icon" />
                <Title level={2} className="checkout-success-title">Đặt hàng thành công!</Title>
                <Text>Mã đơn hàng: <strong>#{orderedMahang}</strong></Text>
                <div className="checkout-success-actions">
                    <Link to="/orders"><Button type="primary" className="checkout-success-order-btn">Xem đơn mua</Button></Link>
                    <Link to="/"><Button>Về trang chủ</Button></Link>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page-wrap">
            <Title level={2}>💳 Thanh toán</Title>
            <Row gutter={[24, 24]}>
                {/* Form thông tin */}
                <Col xs={24} md={14}>
                    <Card title="Thông tin giao hàng" className="checkout-card">
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                            <Form.Item label="Họ tên" name="name" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Địa chỉ" name="address" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item label="Hình thức thanh toán" name="payments" rules={[{ required: true }]}>
                                <Select placeholder="Chọn hình thức thanh toán">
                                    <Option value="0">Thanh toán khi nhận hàng (COD)</Option>
                                    <Option value="1">Thanh toán ATM</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Ghi chú" name="note">
                                <Input.TextArea rows={3} placeholder="Ghi chú thêm cho người bán..." />
                            </Form.Item>
                            <Link to="/profile" className="checkout-edit-profile-link">
                                ✏️ Thay đổi thông tin cá nhân
                            </Link>
                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={submitting}
                                    block size="large"
                                    className="checkout-submit-btn"
                                >
                                    Xác nhận đặt hàng
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                {/* Tóm tắt đơn hàng */}
                <Col xs={24} md={10}>
                    <Card title="Đơn hàng của bạn" className="checkout-card">
                        <div className="checkout-order-list">
                            {cartItems.map(item => (
                                <div key={item.cart_id} className="checkout-order-item">
                                    <div className="checkout-order-item-left">
                                        <img src={IMAGE_BASE + item.product_image} alt="" className="checkout-order-img" />
                                        <div>
                                            <div className="checkout-order-name">{item.product_name}</div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{item.variant_name}</Text>
                                            <br />
                                            <Text type="secondary" className="checkout-order-qty">x{item.product_quantity}</Text>
                                        </div>
                                    </div>
                                    <Text strong className="checkout-order-price">
                                        {formatCurrency(getItemPrice(item) * item.product_quantity)}
                                    </Text>
                                </div>
                            ))}
                        </div>
                        <Divider />
                        <div className="checkout-shipping-row">
                            <Text>Phí vận chuyển:</Text><Text>Miễn phí</Text>
                        </div>
                        <div className="checkout-total-row--mt">
                            <Text strong className="checkout-total-label">Tổng thanh toán:</Text>
                            <Text strong className="checkout-total-value">{formatCurrency(total)}</Text>
                        </div>
                    </Card>
                    <div className="checkout-back-btn-wrap">
                        <Link to="/cart"><Button block>← Quay lại giỏ hàng</Button></Link>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default Checkout;
