import React, { useState, useEffect } from 'react';
import { Tabs, Form, Input, InputNumber, Switch, Button, message, Spin, Card, Typography, TimePicker, Divider, Upload } from 'antd';
import { GlobalOutlined, TruckOutlined, ShopOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../../services/axiosClient';
import './SystemSettings.css';

const { Title, Text } = Typography;

const SystemSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Gọi API lấy dữ liệu cấu hình hiện tại khi component được render
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setFetching(true);
        const timestamp = new Date().getTime();
        const res = await axiosClient.get(`/settings?t=${timestamp}`);
        
        // Giả sử API trả về mảng object [{ key: 'store_name', value: 'EzyMart' }, ...]
        // hoặc trả về dạng object { store_name: 'EzyMart', ... }
        let settingsData = res.data || res;
        const settingsObj = {};

        // Xử lý dữ liệu trả về mảng key-value
        if (Array.isArray(settingsData)) {
          settingsData.forEach(item => {
            if (item.key === 'open_time' || item.key === 'close_time') {
              settingsObj[item.key] = item.value ? dayjs(item.value, 'HH:mm') : null;
            } else if (item.key === 'cod_enabled') {
              settingsObj[item.key] = item.value === 'true' || item.value === true;
            } else if (item.key === 'logo' || item.key === 'favicon') {
              if (item.value && item.value !== 'undefined' && item.value !== 'null') {
                try {
                  const parsed = JSON.parse(item.value);
                  settingsObj[item.key] = Array.isArray(parsed) ? parsed : [{ uid: '-1', name: item.key, status: 'done', url: item.value }];
                } catch {
                  settingsObj[item.key] = [{ uid: '-1', name: item.key, status: 'done', url: item.value }];
                }
              }
            } else {
              settingsObj[item.key] = item.value;
            }
          });
        } 
        // Xử lý dữ liệu trả về là object phẳng
        else if (typeof settingsData === 'object' && settingsData !== null) {
          Object.keys(settingsData).forEach(key => {
            if (key === 'open_time' || key === 'close_time') {
              settingsObj[key] = settingsData[key] ? dayjs(settingsData[key], 'HH:mm') : null;
            } else if (key === 'cod_enabled') {
              settingsObj[key] = settingsData[key] === 'true' || settingsData[key] === true;
            } else if (key === 'logo' || key === 'favicon') {
              if (settingsData[key] && settingsData[key] !== 'undefined' && settingsData[key] !== 'null') {
                try {
                  const parsed = JSON.parse(settingsData[key]);
                  settingsObj[key] = Array.isArray(parsed) ? parsed : [{ uid: '-1', name: key, status: 'done', url: settingsData[key] }];
                } catch {
                  settingsObj[key] = [{ uid: '-1', name: key, status: 'done', url: settingsData[key] }];
                }
              }
            } else {
              settingsObj[key] = settingsData[key];
            }
          });
        }
        
        // Đổ dữ liệu vào Form
        form.setFieldsValue(settingsObj);
      } catch (error) {
        console.error('Lỗi khi tải cài đặt:', error);
        message.error('Không thể tải cài đặt từ máy chủ');
      } finally {
        setFetching(false);
      }
    };
    
    fetchSettings();
  }, [form]);

  // Xử lý khi Submit Form
  const onFinish = async (values) => {
    try {
      setLoading(true);
      
      const formData = new FormData();
      
      Object.keys(values).forEach(key => {
        if (key === 'logo' || key === 'favicon') {
          if (values[key] && values[key].length > 0) {
            const file = values[key][0];
            if (file.originFileObj) {
              formData.append(key, file.originFileObj);
            } else if (file.url) {
              formData.append(key, file.url);
            }
          }
        } else if (key === 'open_time' || key === 'close_time') {
          if (values[key]) {
            formData.append(key, values[key].format('HH:mm'));
          }
        } else if (values[key] !== undefined && values[key] !== null) {
          formData.append(key, values[key]);
        }
      });
      
      // Gửi yêu cầu cập nhật lên backend bằng FormData
      await axiosClient.put('/settings/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      message.success('Cập nhật cài đặt thành công!');
    } catch (error) {
      console.error('Lỗi khi lưu cài đặt:', error);
      message.error('Đã xảy ra lỗi khi lưu cài đặt. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const normFile = (e) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Tải ảnh lên</div>
    </div>
  );

  // Cấu trúc các Tabs
  const items = [
    {
      key: '1',
      label: (
        <span>
          <GlobalOutlined /> Thông tin chung
        </span>
      ),
      children: (
        <div className="settings-tab-content">
          <Title level={4} className="settings-tab-title">Thông tin chung cửa hàng</Title>
          <Text type="secondary" className="settings-tab-desc">Thiết lập các thông tin cơ bản để hiển thị trên website</Text>
          
          <Divider orientation="left">Nhận diện thương hiệu</Divider>
          
          <Form.Item
            name="store_name"
            label="Tên cửa hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên cửa hàng!' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input placeholder="Nhập tên cửa hàng (VD: EzyMart)" size="large" />
          </Form.Item>

          <Form.Item
            name="slogan"
            label="Slogan / Khẩu hiệu"
            style={{ marginBottom: '20px' }}
          >
            <Input placeholder="Nhập slogan (VD: Thực phẩm sạch cho mọi nhà)" size="large" />
          </Form.Item>

          <Form.Item
            name="logo"
            label="Logo website"
            valuePropName="fileList"
            getValueFromEvent={normFile}
            style={{ marginBottom: '20px' }}
          >
            <Upload listType="picture-card" beforeUpload={() => false} maxCount={1}>
              {uploadButton}
            </Upload>
          </Form.Item>

          <Form.Item
            name="favicon"
            label="Favicon"
            valuePropName="fileList"
            getValueFromEvent={normFile}
            style={{ marginBottom: '20px' }}
          >
            <Upload listType="picture-card" beforeUpload={() => false} maxCount={1}>
              {uploadButton}
            </Upload>
          </Form.Item>

          <Divider orientation="left">Thông tin liên hệ & Pháp lý</Divider>
          
          <Form.Item
            name="hotline"
            label="Hotline"
            rules={[{ required: true, message: 'Vui lòng nhập hotline!' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input placeholder="Nhập số điện thoại hotline" size="large" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email liên hệ"
            rules={[{ type: 'email', message: 'Định dạng email không hợp lệ!' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input placeholder="Nhập địa chỉ email hỗ trợ (VD: support@ezymart.com)" size="large" />
          </Form.Item>
          
          <Form.Item
            name="address"
            label="Địa chỉ cửa hàng"
            style={{ marginBottom: '20px' }}
          >
            <Input.TextArea rows={3} placeholder="Nhập địa chỉ chi tiết của cửa hàng" size="large" />
          </Form.Item>

          <Form.Item
            name="google_maps"
            label="Mã nhúng Google Maps"
            style={{ marginBottom: '20px' }}
          >
            <Input.TextArea rows={4} placeholder="Dán mã iframe từ Google Maps vào đây" size="large" />
          </Form.Item>

          <Form.Item
            name="footer_copyright"
            label="Dòng chữ Bản quyền Footer"
            style={{ marginBottom: '20px' }}
          >
            <Input placeholder="VD: © 2026 EzyMart. All rights reserved" size="large" />
          </Form.Item>

          <Divider orientation="left">Mạng xã hội</Divider>
          
          <Form.Item
            name="facebook_link"
            label="Link Fanpage Facebook"
            rules={[{ type: 'url', message: 'Đường dẫn không hợp lệ!' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input placeholder="Nhập link fanpage facebook (VD: https://facebook.com/...)" size="large" />
          </Form.Item>

          <Form.Item
            name="zalo_link"
            label="Link Zalo OA"
            rules={[{ type: 'url', message: 'Đường dẫn không hợp lệ!' }]}
            style={{ marginBottom: '20px' }}
          >
            <Input placeholder="Nhập link Zalo OA (VD: https://zalo.me/...)" size="large" />
          </Form.Item>
        </div>
      )
    },
    {
      key: '2',
      label: (
        <span>
          <TruckOutlined /> Vận chuyển & Thanh toán
        </span>
      ),
      children: (
        <div className="settings-tab-content">
          <Title level={4} className="settings-tab-title">Vận chuyển & Thanh toán</Title>
          <Text type="secondary" className="settings-tab-desc">Cấu hình chi phí vận chuyển và các phương thức thanh toán</Text>
          
          <Form.Item
            name="shipping_fee"
            label="Phí giao hàng cố định (VND)"
            rules={[{ required: true, message: 'Vui lòng nhập phí giao hàng!' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder="VD: 30000" 
              size="large"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              min={0}
            />
          </Form.Item>
          
          <Form.Item
            name="free_ship_threshold"
            label="Ngưỡng miễn phí ship (VND)"
            tooltip="Đơn hàng có giá trị lớn hơn hoặc bằng mức này sẽ được miễn phí vận chuyển"
          >
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder="VD: 500000" 
              size="large"
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
              min={0}
            />
          </Form.Item>
        </div>
      )
    },
    {
      key: '3',
      label: (
        <span>
          <ShopOutlined /> Giờ hoạt động
        </span>
      ),
      children: (
        <div className="settings-tab-content">
          <Title level={4} className="settings-tab-title">Giờ hoạt động</Title>
          <Text type="secondary" className="settings-tab-desc">Khung giờ mở cửa hoạt động của cửa hàng</Text>
          
          <div className="time-picker-group">
            <Form.Item
              name="open_time"
              label="Giờ mở cửa"
              style={{ flex: 1, marginRight: '16px' }}
            >
              <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} placeholder="Chọn giờ mở cửa" />
            </Form.Item>
            
            <Form.Item
              name="close_time"
              label="Giờ đóng cửa"
              style={{ flex: 1 }}
            >
              <TimePicker format="HH:mm" size="large" style={{ width: '100%' }} placeholder="Chọn giờ đóng cửa" />
            </Form.Item>
          </div>
        </div>
      )
    }
  ];

  if (fetching) {
    return (
      <div className="settings-loading-container">
        <Spin size="large" tip="Đang tải cài đặt..." />
      </div>
    );
  }

  return (
    <div className="system-settings-container">
      <div className="settings-header">
        <Title level={2}>⚙️ Cài đặt</Title>
        <Text type="secondary">Quản lý các thông số hoạt động chung của hệ thống EzyMart</Text>
      </div>
      
      <Card className="settings-card" bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            cod_enabled: true
          }}
        >
          <Tabs 
            tabPosition="left" 
            items={items}
            className="settings-tabs"
          />
          
          <div className="settings-form-actions">
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={loading}
              className="btn-save-settings"
              size="large"
            >
              Lưu cài đặt
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default SystemSettings;
