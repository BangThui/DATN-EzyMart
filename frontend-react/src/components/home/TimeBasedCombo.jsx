import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, message, Spin, Typography } from 'antd';
import { PlusCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axiosClient from '../../services/axiosClient';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
import { formatCurrency } from '../../utils';
import './TimeBasedCombo.css'; // Import file CSS mới tạo

const { Title } = Typography;

const TimeBasedCombo = () => {
  const [comboData, setComboData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchCombo = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get('/recommendations/combo');
        if (response.success) {
          setComboData(response);
        }
      } catch (error) {
        console.error('Lỗi khi tải combo gợi ý:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCombo();
  }, []);

  const handleAddAllToCart = async () => {
    if (!user) {
      message.warning('Vui lòng đăng nhập để thêm vào giỏ hàng!');
      return;
    }
    
    if (!comboData || !comboData.items || comboData.items.length === 0) return;

    try {
      for (const product of comboData.items) {
         await cartService.addToCart(user.user_id, product.product_id, 1);
      }
      message.success('Đã thêm toàn bộ sản phẩm trong Combo vào giỏ hàng của bạn!');
    } catch (error) {
      console.error('Lỗi khi thêm combo vào giỏ:', error);
      message.error('Có lỗi xảy ra khi thêm vào giỏ hàng.');
    }
  };

  if (loading) {
    return (
      <Card className="time-combo-loading-card">
        <div className="time-combo-loading-content">
          <Spin size="large" tip="Đang tải gợi ý mua sắm..." />
        </div>
      </Card>
    );
  }

  if (!comboData || !comboData.items || comboData.items.length === 0) {
    return null;
  }

  return (
    <Card className="time-combo-card">
      <div className="time-combo-header">
        <Title level={4} className="time-combo-title">
          <ClockCircleOutlined className="time-combo-icon" />
          {comboData.comboName}
        </Title>
        <Button 
          type="primary" 
          icon={<PlusCircleOutlined />} 
          className="time-combo-btn"
          onClick={handleAddAllToCart}
        >
          Thêm nhanh cả Combo vào giỏ
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {comboData.items.map(product => (
          <Col xs={24} sm={12} md={8} lg={6} key={product.product_id}>
            <Card
              hoverable
              cover={
                <img 
                  alt={product.product_name} 
                  src={getImageUrl(product.product_image)} 
                  className="time-combo-product-img"
                  onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }}
                />
              }
              className="time-combo-product-card"
              bodyStyle={{ padding: '12px' }}
            >
              <div className="time-combo-product-name">
                {product.product_name}
              </div>
              <div className="time-combo-product-price">
                {formatCurrency(product.price || product.dongia || 0)}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default TimeBasedCombo;
