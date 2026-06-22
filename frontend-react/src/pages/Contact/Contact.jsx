import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Typography,
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
} from "antd";
import {
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  FacebookOutlined,
  YoutubeOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import "./Contact.css";
import axiosClient from "../../services/axiosClient";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Contact = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({
    store_name: "EzyMart",
    hotline: "0349484515",
    email: "support@ezymart.com",
    address: "Tổ 123, Phường Yên Nghĩa, Hà Đông, Hà Nội",
    facebook_link: "https://facebook.com",
    zalo_link: "https://zalo.me",
    google_maps: "",
    open_time: "07:00",
    close_time: "22:00"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await axiosClient.get(`/settings?t=${timestamp}`);
        if (res) {
          setSettings(prev => ({ ...prev, ...res }));
        }
      } catch (error) {
        console.error("Lỗi lấy cấu hình trang liên hệ:", error);
      }
    };
    fetchSettings();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await axiosClient.post("/contact", {
        fullName: values.fullName,
        contactMethod: values.contactMethod,
        subject: values.subject,
        message: values.message,
      });
      message.success(
        res?.message || "Gửi tin nhắn thành công! EzyMart sẽ phản hồi bạn sớm nhất.",
        5
      );
      form.resetFields();
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        "Gửi tin nhắn thất bại. Vui lòng thử lại hoặc liên hệ qua hotline.";
      message.error(errMsg, 6);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="contact-page-container">
      <div className="contact-card-wrap">
        <Row gutter={[48, 48]} align="stretch">
          {/* Cột trái: Thông tin liên hệ */}
          <Col xs={24} lg={10} className="contact-info-col">
            <div className="contact-info-content">
              <Title level={2} className="contact-info-title">
                Liên hệ với {settings.store_name}
              </Title>
              <Paragraph className="contact-info-desc">
                Chúng tôi luôn sẵn sàng lắng nghe ý kiến đóng góp, phản hồi cũng
                như giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy
                liên hệ ngay với chúng tôi!
              </Paragraph>

              <Space
                direction="vertical"
                size="large"
                className="contact-info-list"
              >
                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <HomeOutlined className="contact-info-icon" />
                  </div>
                  <div className="contact-info-text-wrapper">
                    <Text className="contact-info-label">Địa chỉ</Text>
                    <Text className="contact-info-val">
                      {settings.address}
                    </Text>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <PhoneOutlined className="contact-info-icon" />
                  </div>
                  <div className="contact-info-text-wrapper">
                    <Text className="contact-info-label">Hotline</Text>
                    <a
                      href={`tel:${settings.hotline}`}
                      className="contact-info-val contact-link"
                    >
                      {settings.hotline}
                    </a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <MailOutlined className="contact-info-icon" />
                  </div>
                  <div className="contact-info-text-wrapper">
                    <Text className="contact-info-label">Email</Text>
                    <a
                      href={`mailto:${settings.email}`}
                      className="contact-info-val contact-link"
                    >
                      {settings.email}
                    </a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <div className="contact-info-icon-wrapper">
                    <ClockCircleOutlined className="contact-info-icon" />
                  </div>
                  <div className="contact-info-text-wrapper">
                    <Text className="contact-info-label">Giờ mở cửa</Text>
                    <Text className="contact-info-val">
                      {settings.open_time} - {settings.close_time} hằng ngày
                    </Text>
                  </div>
                </div>
              </Space>

              {/* Mạng xã hội */}
              <div className="contact-social-section">
                <Text className="contact-social-title">Theo dõi chúng tôi</Text>
                <div className="contact-social-icons">
                  <a
                    href={settings.facebook_link}
                    target="_blank"
                    rel="noreferrer"
                    className="contact-social-btn facebook"
                  >
                    <FacebookOutlined />
                  </a>
                  <a
                    href={settings.zalo_link}
                    target="_blank"
                    rel="noreferrer"
                    className="contact-social-btn zalo"
                  >
                    <MessageOutlined />
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noreferrer"
                    className="contact-social-btn youtube"
                  >
                    <YoutubeOutlined />
                  </a>
                </div>
              </div>
            </div>
          </Col>

          {/* Cột phải: Form gửi góp ý */}
          <Col xs={24} lg={14} className="contact-form-col">
            <Card className="contact-form-card" bordered={false}>
              <Title level={3} className="contact-form-title">
                Gửi góp ý của bạn
              </Title>
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                className="contact-form-element"
                requiredMark={false}
              >
                <Form.Item
                  label="Họ và tên"
                  name="fullName"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập họ và tên của bạn!",
                    },
                  ]}
                >
                  <Input placeholder="Nguyễn Văn A" size="large" />
                </Form.Item>

                <Form.Item
                  label="Số điện thoại / Email"
                  name="contactMethod"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập số điện thoại hoặc email!",
                    },
                  ]}
                >
                  <Input
                    placeholder="0987654321 hoặc a@gmail.com"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="Chủ đề"
                  name="subject"
                  initialValue="Góp ý dịch vụ"
                  rules={[{ required: true, message: "Vui lòng chọn chủ đề!" }]}
                >
                  <Select
                    size="large"
                    dropdownClassName="contact-select-dropdown"
                  >
                    <Option value="Góp ý dịch vụ">Góp ý dịch vụ</Option>
                    <Option value="Hỏi đáp sản phẩm">Hỏi đáp sản phẩm</Option>
                    <Option value="Khiếu nại đơn hàng">
                      Khiếu nại đơn hàng
                    </Option>
                    <Option value="Hợp tác kinh doanh">
                      Hợp tác kinh doanh
                    </Option>
                  </Select>
                </Form.Item>

                <Form.Item label="Nội dung tin nhắn" name="message">
                  <Input.TextArea
                    rows={4}
                    placeholder="Hãy chia sẻ ý kiến hoặc thắc mắc của bạn tại đây..."
                    size="large"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    size="large"
                    loading={loading}
                    className="contact-submit-btn"
                  >
                    Gửi tin nhắn
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Khối chân trang: Bản đồ nhúng Google Maps */}
      <div className="contact-map-wrap">
        {settings.google_maps ? (
          <div dangerouslySetInnerHTML={{ __html: settings.google_maps }} />
        ) : (
          <iframe
            title="Google Maps"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1083.2548618734693!2d105.73915548869296!3d20.93668875207881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345302312d9367%3A0xb3e1f04d06d97111!2zS2h1IMSQ4bqldCBE4buLY2ggVuG7pSDEkOG7k25nIE1haQ!5e0!3m2!1svi!2s!4v1779098610203!5m2!1svi!2s"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        )}
      </div>
    </div>
  );
};

export default Contact;
