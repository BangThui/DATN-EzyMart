import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Select, Button, Card, Typography, Divider, message, Row, Col, Alert, Radio, Space } from 'antd';
import { CheckCircleOutlined, CarOutlined, ShopOutlined } from '@ant-design/icons';
import { DatePicker } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { cartService } from '../../services/cartService';
import { orderService } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import axiosClient from '../../services/axiosClient';
import './Checkout.css';
import { getImageUrl } from '../../utils/imageHelper';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/vi';
dayjs.extend(isSameOrBefore);
dayjs.locale('vi');

const { Title, Text } = Typography;
const { Option } = Select;
// const IMAGE_BASE = 'http://localhost:5000/uploads/'; // Replaced by getImageUrl

const Checkout = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [orderedMahang, setOrderedMahang] = useState(null);
    const [form] = Form.useForm();
    const [paymentMethod, setPaymentMethod] = useState('');
    const [shippingMethod, setShippingMethod] = useState('delivery');
    const [tempOrderId, setTempOrderId] = useState(null);
    const localOrderIdRef = useRef(null);

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

    const handlePaypalCreateOrder = async () => {
        try {
            // Validate form trước khi tạo đơn hàng
            const values = await form.validateFields();
            
            let currentOrderId = tempOrderId || localOrderIdRef.current;

            if (!currentOrderId) {
                if (cartItems.length === 0) {
                    message.error('Giỏ hàng trống');
                    return Promise.reject(new Error('Giỏ hàng trống'));
                }

                setSubmitting(true);

                // 1. Gọi API lưu đơn hàng vào database locally với status pending
                const res = await orderService.create({
                    ...values,
                    user_id: user.user_id,
                    shipping_method: shippingMethod,
                    pickup_time: shippingMethod === 'pickup' && values.pickup_time
                        ? values.pickup_time.toISOString()
                        : null,
                    cart_items: cartItems.map(item => ({
                        product_id: item.product_id,
                        variant_id: item.variant_id,
                        variant_price: item.variant_price,
                        variant_discount: item.variant_discount,
                        product_quantity: item.product_quantity
                    }))
                });

                const localOrderId = res.mahang || res.order_id;
                localOrderIdRef.current = localOrderId;
                setTempOrderId(localOrderId);
                currentOrderId = localOrderId;
            } else {
                setSubmitting(true);
            }

            // 2. Gọi API backend PayPal đổi tỷ giá và tạo giao dịch
            const paypalRes = await axiosClient.post('/payment/paypal/create-order', {
                order_id: currentOrderId
            });

            return paypalRes.id; // Trả về PayPal Order ID cho PayPal Buttons
        } catch (err) {
            console.error('PayPal Create Order Error:', err);
            const errMsg = err.response?.data?.error || err.message || 'Khởi tạo đơn hàng PayPal thất bại';
            message.error(errMsg);
            setSubmitting(false);
            return Promise.reject(err);
        }
    };

    const handlePaypalApprove = async (data, actions) => {
        try {
            // Gọi API backend capture đơn hàng
            const res = await axiosClient.post('/payment/paypal/capture-order', {
                paypalOrderId: data.orderID,
                order_id: localOrderIdRef.current || tempOrderId
            });

            message.success('Thanh toán đơn hàng qua PayPal thành công!');
            setOrderedMahang(localOrderIdRef.current || tempOrderId);
        } catch (err) {
            console.error('PayPal Capture Error:', err);
            message.error(err.response?.data?.error || 'Xác nhận thanh toán thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (values) => {
        if (cartItems.length === 0) { message.error('Giỏ hàng trống'); return; }
        setSubmitting(true);
        try {
            const res = await orderService.create({
                ...values,
                user_id: user.user_id,
                shipping_method: shippingMethod,
                pickup_time: shippingMethod === 'pickup' && values.pickup_time
                    ? values.pickup_time.toISOString()
                    : null,
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
        const isPickup = shippingMethod === 'pickup';
        return (
            <div className="checkout-success-wrap">
                <CheckCircleOutlined className="checkout-success-icon" />
                <Title level={2} className="checkout-success-title">Đặt hàng thành công!</Title>
                <Text>Mã đơn hàng: <strong>#{orderedMahang}</strong></Text>
                {isPickup && (
                    <div className="checkout-pickup-info-box">
                        <ShopOutlined className="checkout-pickup-info-icon" />
                        <Text className="checkout-pickup-info-text">Đơn hàng của bạn sẽ được chuẩn bị sẵn tại quầy. Vui lòng đến đúng giờ hẹn để nhận hàng!</Text>
                    </div>
                )}
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

                            {/* ── Phương thức nhận hàng ── */}
                            <Form.Item
                                label="Phương thức nhận hàng"
                                name="shipping_method"
                                initialValue="delivery"
                                rules={[{ required: true, message: 'Vui lòng chọn phương thức nhận hàng' }]}
                            >
                                <Radio.Group
                                    value={shippingMethod}
                                    onChange={(e) => {
                                        setShippingMethod(e.target.value);
                                        // Reset pickup_time khi chuyển sang delivery
                                        if (e.target.value === 'delivery') {
                                            form.setFieldsValue({ pickup_time: null });
                                        }
                                    }}
                                >
                                    <Space direction="vertical" size={8}>
                                        <Radio value="delivery">
                                            <Space>
                                                <CarOutlined className="checkout-delivery-icon" />
                                                <span><strong>Giao hàng tận nơi</strong></span>
                                            </Space>
                                        </Radio>
                                        <Radio value="pickup">
                                            <Space>
                                                <ShopOutlined className="checkout-pickup-icon" />
                                                <span><strong>Nhận tại cửa hàng</strong> <span className="checkout-pickup-badge-text">(Click &amp; Collect)</span></span>
                                            </Space>
                                        </Radio>
                                    </Space>
                                </Radio.Group>
                            </Form.Item>

                            {/* ── Hẹn giờ nhận hàng (chỉ hiện khi chọn pickup) ── */}
                            {shippingMethod === 'pickup' && (
                                <Form.Item
                                    label="🕐 Chọn thời gian hẹn đến lấy hàng"
                                    name="pickup_time"
                                    rules={[
                                        { required: true, message: 'Vui lòng chọn thời gian hẹn' },
                                        {
                                            validator: (_, value) => {
                                                if (!value) return Promise.resolve();
                                                const now = dayjs();
                                                if (value.isSameOrBefore(now)) {
                                                    return Promise.reject('Thời gian hẹn phải là trong tương lai');
                                                }
                                                const hours = value.hour();
                                                const minutes = value.minute();
                                                const totalMin = hours * 60 + minutes;
                                                if (totalMin < 7 * 60 || totalMin > 22 * 60) {
                                                    return Promise.reject('Giờ hẹn phải nằm trong khung 07:00 – 22:00');
                                                }
                                                return Promise.resolve();
                                            }
                                        }
                                    ]}
                                    extra="Cửa hàng mở cửa từ 07:00 đến 22:00 hàng ngày"
                                >
                                    <DatePicker
                                        showTime={{ format: 'HH:mm', minuteStep: 15 }}
                                        format="DD/MM/YYYY HH:mm"
                                        placeholder="Chọn ngày và giờ hẹn đến lấy"
                                        className="checkout-w-full"
                                        locale={{
                                            lang: {
                                                locale: 'vi_VN',
                                                placeholder: 'Chọn ngày',
                                                rangePlaceholder: ['Từ ngày', 'Đến ngày'],
                                                today: 'Hôm nay',
                                                now: 'Bây giờ',
                                                backToToday: 'Trở về hôm nay',
                                                ok: 'Xác nhận',
                                                clear: 'Xóa',
                                                month: 'Tháng',
                                                year: 'Năm',
                                                timeSelect: 'Chọn giờ',
                                                dateSelect: 'Chọn ngày',
                                                monthSelect: 'Chọn tháng',
                                                yearSelect: 'Chọn năm',
                                                decadeSelect: 'Chọn thập kỷ',
                                                previousMonth: 'Tháng trước',
                                                nextMonth: 'Tháng sau',
                                                previousYear: 'Năm trước',
                                                nextYear: 'Năm sau',
                                            },
                                            timePickerLocale: { placeholder: 'Chọn giờ' },
                                        }}
                                        disabledDate={(current) => current && current < dayjs().startOf('day')}
                                        disabledTime={(date) => {
                                            if (!date) return {};
                                            const isToday = date && date.isSame(dayjs(), 'day');
                                            const currentHour = dayjs().hour();
                                            const currentMinute = dayjs().minute();
                                            return {
                                                disabledHours: () => {
                                                    const hours = [];
                                                    // Disable trước 7h và sau 22h
                                                    for (let i = 0; i < 7; i++) hours.push(i);
                                                    for (let i = 23; i < 24; i++) hours.push(i);
                                                    // Nếu là hôm nay, disable giờ đã qua
                                                    if (isToday) {
                                                        for (let i = 7; i <= currentHour; i++) hours.push(i);
                                                    }
                                                    return [...new Set(hours)];
                                                },
                                                disabledMinutes: (selectedHour) => {
                                                    if (isToday && selectedHour === currentHour + 1) {
                                                        return Array.from({ length: currentMinute }, (_, i) => i);
                                                    }
                                                    return [];
                                                },
                                            };
                                        }}
                                    />
                                </Form.Item>
                            )}

                            {shippingMethod === 'delivery' && (
                                <Form.Item label="Địa chỉ" name="address" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ giao hàng' }]}>
                                    <Input placeholder="Nhập địa chỉ nhận hàng" />
                                </Form.Item>
                            )}
                            <Form.Item label="Hình thức thanh toán" name="payments" rules={[{ required: true }]}>
                                <Select placeholder="Chọn hình thức thanh toán" onChange={(val) => setPaymentMethod(val)}>
                                    <Option value="0">Thanh toán khi nhận hàng (COD)</Option>
                                    <Option value="paypal">Thanh toán qua PayPal</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Ghi chú" name="note">
                                <Input.TextArea rows={3} placeholder="Ghi chú thêm cho người bán..." />
                            </Form.Item>
                            <Link to="/profile" className="checkout-edit-profile-link">
                                ✏️ Thay đổi thông tin cá nhân
                            </Link>
                            {paymentMethod === 'paypal' ? (
                                <PayPalScriptProvider options={{ 
                                    "client-id": "Abyb3e-LitkcVfYfpwKU0BAIm_eC0KpmVsOCmWwRA87IQmo1Bt5v1zY2pnwLh6kJ3C7RqAIR2nk9gEsh",
                                    currency: "USD",
                                    intent: "capture"
                                }}>
                                    <div className="checkout-paypal-wrapper">
                                        <PayPalButtons
                                            style={{ layout: "vertical" }}
                                            createOrder={handlePaypalCreateOrder}
                                            onApprove={handlePaypalApprove}
                                            onError={(err) => {
                                                console.error("PayPal Error:", err);
                                                message.error("Có lỗi xảy ra trong quá trình thanh toán PayPal.");
                                                setSubmitting(false);
                                            }}
                                            onCancel={() => {
                                                message.warning("Bạn đã hủy thanh toán PayPal.");
                                                setSubmitting(false);
                                            }}
                                        />
                                    </div>
                                </PayPalScriptProvider>
                            ) : (
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
                            )}
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
                                        <img src={getImageUrl(item.product_image)} alt="" className="checkout-order-img" />
                                        <div>
                                            <div className="checkout-order-name">{item.product_name}</div>
                                            <Text type="secondary" className="checkout-item-variant">{item.variant_name}</Text>
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
