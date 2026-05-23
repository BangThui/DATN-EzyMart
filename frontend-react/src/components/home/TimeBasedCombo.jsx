import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, Typography, Tabs, message } from 'antd';
import { PlusCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axiosClient from '../../services/axiosClient';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';
import ProductCard from '../product/ProductCard';
import './TimeBasedCombo.css';

const { Title } = Typography;

const TimeBasedCombo = () => {
  const [comboData, setComboData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTabKey, setActiveTabKey] = useState(null);
  
  const { user } = useAuth();

  useEffect(() => {
    const fetchCombo = async () => {
      try {
        setLoading(true);
        // Hỗ trợ truyền ?hour trên URL để phục vụ việc test giao diện
        const queryParams = new URLSearchParams(window.location.search);
        const hourParam = queryParams.get('hour');
        const url = hourParam ? `/recommendations/combo?hour=${hourParam}` : '/recommendations/combo';
        
        const response = await axiosClient.get(url);
        if (response.success) {
          setComboData(response);
          if (response.combos && response.combos.length > 0) {
            setActiveTabKey(response.combos[0].id_combo);
          }
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
    
    if (!comboData || !comboData.combos || comboData.combos.length === 0) return;

    // Tìm combo đang hiển thị ở tab hiện tại
    const activeCombo = comboData.combos.find(c => c.id_combo === activeTabKey);
    if (!activeCombo || !activeCombo.items || activeCombo.items.length === 0) {
      message.warning('Không có sản phẩm nào trong Combo này!');
      return;
    }

    try {
      for (const product of activeCombo.items) {
         const defaultVariantId = product.variants?.[0]?.variant_id;
         if (defaultVariantId) {
            await cartService.addToCart({
              product_id: product.product_id,
              variant_id: defaultVariantId,
              quantity: 1,
              user_id: user.user_id,
            });
         }
      }
      message.success(`Đã thêm toàn bộ sản phẩm trong Combo "${activeCombo.comboName}" vào giỏ hàng!`);
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

  if (!comboData || !comboData.combos || comboData.combos.length === 0) {
    return null;
  }

  const tabItems = comboData.combos.map(combo => ({
    key: combo.id_combo,
    label: combo.comboName,
    children: (
      <div className="time-combo-products-grid">
        {combo.items.map(product => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>
    )
  }));

  return (
    <Card className="time-combo-card">
      <div className="time-combo-header">
        <Title level={4} className="time-combo-title">
          <ClockCircleOutlined className="time-combo-icon" />
          {comboData.title}
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

      <Tabs 
        activeKey={activeTabKey} 
        onChange={setActiveTabKey}
        items={tabItems}
        className="time-combo-tabs"
      />
    </Card>
  );
};

export default TimeBasedCombo;
