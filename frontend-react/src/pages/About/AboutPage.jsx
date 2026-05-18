import React, { useEffect } from "react";
import { Typography } from "antd";
import "./AboutPage.css";

const { Title, Paragraph } = Typography;

const AboutPage = () => {
  // Scroll to top when the component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="about-page-wrap">
      {/* Phần 1: Tiêu đề và mô tả */}
      <div className="about-header">
        <Title level={1} className="about-title">
          Giới thiệu EzyMart
        </Title>
        <Paragraph className="about-desc">
          EzyMart là hệ thống siêu thị hiện đại chuyên cung cấp đa dạng các mặt
          hàng tiêu dùng, thực phẩm tươi sống và đồ gia dụng chất lượng cao. Với
          nguồn hàng được tuyển chọn kỹ lưỡng từ các nhà cung cấp uy tín, chúng
          tôi cam kết mang đến sản phẩm an toàn với mức giá hợp lý cho mọi gia
          đình Việt.
        </Paragraph>
        <Paragraph className="about-desc">
          Luôn nỗ lực lấy khách hàng làm trọng tâm, EzyMart không ngừng nâng cao
          chất lượng dịch vụ nhằm mang lại trải nghiệm mua sắm tiện lợi và đáng
          tin cậy nhất. Sự tận tâm của đội ngũ nhân viên cùng định hướng phát
          triển bền vững chính là lời tri ân thiết thực nhất chúng tôi gửi đến bạn.
        </Paragraph>
        <Paragraph className="about-desc">
          Trong tương lai, EzyMart hướng đến việc tiếp tục mở rộng hệ sinh thái
          bán lẻ, tích cực ứng dụng công nghệ hiện đại để tạo nên một không gian
          mua sắm thông minh, tiện ích và gần gũi với mọi người.
        </Paragraph>
      </div>

      {/* Phần 2: Hai hình ảnh hiển thị cạnh nhau (responsive grid) */}
      <div className="about-gallery">
        <div className="about-img-wrapper">
          <img
            src="/images/gioi-thieu-ezymart-2.jpg"
            alt="Giới thiệu về EzyMart - Ảnh 1"
            className="about-img"
          />
        </div>
        <div className="about-img-wrapper">
          <img
            src="/images/gioi-thieu-ezymart-3.jpg"
            alt="Giới thiệu về EzyMart - Ảnh 2"
            className="about-img"
          />
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
