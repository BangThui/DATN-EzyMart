import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Row, Col, Typography, Button, Spin, Breadcrumb, Tag,
    InputNumber, Divider, Tabs, Rate, message, Space, Badge, Radio
} from 'antd';
import {
    ShoppingCartOutlined, ThunderboltOutlined, CheckCircleOutlined,
    ShareAltOutlined, HeartOutlined, SafetyOutlined, UndoOutlined,
    CarOutlined, StarFilled
} from '@ant-design/icons';
import { productService } from '../../services/productService';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../../components/product/ProductCard';
import './ProductDetail.css';

const { Title, Text, Paragraph } = Typography;
const IMAGE_BASE = '/images/';
const UPLOAD_BASE = 'http://localhost:5000/uploads/';

const ProductDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [similar, setSimilar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [addingCart, setAddingCart] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await productService.getById(id);
                if (res) {
                    setProduct(res);
                    if (res.variants && res.variants.length > 0) {
                        setSelectedVariant(res.variants[0]);
                    }
                    try {
                        const sim = await productService.getSimilar(res.category_id, id);
                        setSimilar(sim || []);
                    } catch { /* ignore */ }
                }
            } catch (e) {
                console.error('Error loading product:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        window.scrollTo(0, 0);
    }, [id]);

    const handleAddToCart = async () => {
        if (!selectedVariant) {
            message.error('Vui lòng chọn phân loại sản phẩm!');
            return;
        }
        setAddingCart(true);
        try {
            await cartService.addToCart({ product_id: product.product_id, variant_id: selectedVariant.variant_id, quantity, user_id: user?.user_id });
            message.success({ content: '✅ Đã thêm vào giỏ hàng!', style: { marginTop: 60 } });
        } catch { message.error('Lỗi thêm vào giỏ hàng'); }
        finally { setAddingCart(false); }
    };

    if (loading) return (
        <div className="detail-loading-center">
            <Spin size="large" />
        </div>
    );

    if (!product) return (
        <div className="detail-empty-center">
            <Title level={3} className="detail-empty-title">Không tìm thấy sản phẩm</Title>
            <Link to="/"><Button type="primary">Về trang chủ</Button></Link>
        </div>
    );

    const price = selectedVariant?.variant_price || 0;
    const discountPrice = selectedVariant?.variant_discount || 0;
    const stockQuantity = selectedVariant?.variant_quantity || 0;

    const hasDiscount = discountPrice && Number(discountPrice) > 0 && Number(discountPrice) < Number(price);
    const displayPrice = hasDiscount ? discountPrice : price;
    const discountPercent = hasDiscount ? Math.round((1 - Number(discountPrice) / Number(price)) * 100) : 0;
    const imgSrc = product.product_image ? `${IMAGE_BASE}${product.product_image}` : '/placeholder.png';

    const tabItems = [
        {
            key: 'desc',
            label: 'Mô tả sản phẩm',
            children: (
                <div className="detail-desc-wrap">
                    <Paragraph className="detail-desc-text">
                        {product.product_details || 'Chưa có mô tả chi tiết.'}
                    </Paragraph>
                    <Paragraph className="detail-desc-subtext">
                        {product.product_description}
                    </Paragraph>
                </div>
            ),
        },
        {
            key: 'specs',
            label: 'Thông tin thêm',
            children: (
                <div className="detail-specs-grid">
                    {[
                        { label: 'Danh mục', value: product.category_name },
                        { label: 'Số lượng còn', value: `${stockQuantity} sản phẩm` },
                        { label: 'Tình trạng', value: stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng' },
                    ].map((item, i) => (
                        <div key={i} className="detail-spec-item">
                            <div className="detail-spec-label">{item.label.toUpperCase()}</div>
                            <div className="detail-spec-value">{item.value}</div>
                        </div>
                    ))}
                </div>
            ),
        },
    ];

    return (
        <div>
            {/* Breadcrumb */}
            <div className="page-breadcrumb">
                <Breadcrumb items={[
                    { title: <Link to="/">Trang chủ</Link> },
                    { title: <Link to={`/category/${product.category_id}`}>{product.category_name}</Link> },
                    { title: <span className="detail-breadcrumb-last">{product.product_name}</span> },
                ]} />
            </div>

            <div className="detail-wrap">
                <div className="detail-card">
                    <Row gutter={[48, 32]}>
                        {/* Left: Image */}
                        <Col xs={24} md={10}>
                            <div className="detail-img-container">
                                {hasDiscount && (
                                    <div className="product-badge detail-badge-pos">-{discountPercent}%</div>
                                )}
                                <img
                                    className="detail-img"
                                    src={imgSrc}
                                    alt={product.product_name}
                                    onError={e => { e.target.src = `${UPLOAD_BASE}${product.product_image}`; }}
                                />
                            </div>
                        </Col>

                        {/* Right: Info */}
                        <Col xs={24} md={14}>
                            <div className="detail-brand">{product.category_name}</div>
                            <Title level={2} className="detail-title-text">{product.product_name}</Title>

                            {/* Rating placeholder */}
                            <div className="detail-rating">
                                <Rate disabled defaultValue={4.5} allowHalf className="detail-rating-stars" />
                                <Text className="detail-rating-text">(4.5 / 5 • 128 đánh giá)</Text>
                            </div>

                            {/* Price */}
                            <div className="detail-price-block">
                                <Title level={1} className="detail-price-current">
                                    {Number(displayPrice || 0).toLocaleString('vi-VN')}vnd
                                </Title>
                                {hasDiscount && (
                                    <>
                                        <Text delete className="detail-price-old">
                                            Giá gốc: {Number(price || 0).toLocaleString('vi-VN')}vnd
                                        </Text>
                                        <div className="detail-save-badge">
                                            🎉 Tiết kiệm {Number(price - discountPrice).toLocaleString('vi-VN')}vnd
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Variants Selection */}
                            {product.variants && product.variants.length > 0 && (
                                <div className="detail-variants-section">
                                    <Text strong>Chọn loại / Dung tích:</Text>
                                    <div style={{ marginTop: 8, marginBottom: 16 }}>
                                        <Radio.Group
                                            buttonStyle="solid"
                                            value={selectedVariant?.variant_id}
                                            onChange={e => setSelectedVariant(product.variants.find(v => v.variant_id === e.target.value))}
                                        >
                                            {product.variants.map(v => (
                                                <Radio.Button key={v.variant_id} value={v.variant_id}>
                                                    {v.variant_name}
                                                </Radio.Button>
                                            ))}
                                        </Radio.Group>
                                    </div>
                                </div>
                            )}

                            {/* Guarantees */}
                            <Space wrap className="detail-guarantees">
                                <Tag icon={<CarOutlined />} color="green">Giao hàng toàn quốc</Tag>
                                <Tag icon={<UndoOutlined />} color="blue">Đổi trả 7 ngày</Tag>
                                <Tag icon={<SafetyOutlined />} color="gold">Hàng chính hãng</Tag>
                            </Space>

                            <Divider className="detail-divider" />

                            {/* Quantity */}
                            <div className="detail-qty-section">
                                <Text strong className="detail-qty-label">Số lượng:</Text>
                                <InputNumber
                                    min={1}
                                    max={stockQuantity || 99}
                                    value={quantity}
                                    onChange={val => setQuantity(val)}
                                    size="large"
                                    className="detail-qty-input"
                                />
                                <Text className="detail-qty-stock">
                                    Còn {stockQuantity} sản phẩm
                                </Text>
                            </div>

                            {/* Action buttons */}
                            <div className="detail-action-btns">
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<ThunderboltOutlined />}
                                    className="detail-btn-buy"
                                >
                                    Mua ngay
                                </Button>
                                <Button
                                    size="large"
                                    icon={<ShoppingCartOutlined />}
                                    className="detail-btn-cart"
                                    onClick={handleAddToCart}
                                    loading={addingCart}
                                >
                                    Thêm vào giỏ
                                </Button>
                                <Button size="large" icon={<HeartOutlined />} className="detail-heart-btn" />
                            </div>

                            {/* Meta info */}
                            <div className="detail-meta">
                                <div className="detail-meta-item">
                                    <CheckCircleOutlined className="detail-meta-icon" />
                                    <span>Sản phẩm đạt tiêu chuẩn VSATTP</span>
                                </div>
                                <div className="detail-meta-item">
                                    <CarOutlined className="detail-meta-icon" />
                                    <span>Giao hàng nhanh trong 2 giờ tại TP.HCM</span>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {/* Tabs */}
                    <Divider className="detail-tabs-divider" />
                    <Tabs items={tabItems} className="detail-tabs" size="large" />
                </div>

                {/* Similar products */}
                {similar.length > 0 && (
                    <div className="detail-similar-wrap">
                        <div className="section-header">
                            <h2 className="section-title">Sản phẩm tương tự</h2>
                        </div>
                        <div className="products-grid">
                            {similar.slice(0, 4).map(p => (
                                <ProductCard key={p.product_id} product={p} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetail;
