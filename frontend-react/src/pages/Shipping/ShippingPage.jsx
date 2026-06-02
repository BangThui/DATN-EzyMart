import React, { useEffect, useState } from "react";
import { Typography } from "antd";
import axiosClient from "../../services/axiosClient";
import "./ShippingPage.css";

const { Title, Text } = Typography;

const ShippingPage = () => {
  const [settings, setSettings] = useState({
    store_name: "EZYMART",
    hotline: "02471066866",
    email: "cskh@ezymart.com"
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchSettings = async () => {
      try {
        const timestamp = new Date().getTime();
        const res = await axiosClient.get(`/settings?t=${timestamp}`);
        if (res) {
          setSettings(prev => ({
            ...prev,
            store_name: res.store_name ? res.store_name.toUpperCase() : "EZYMART",
            hotline: res.hotline || "02471066866",
            email: res.email || "cskh@ezymart.com"
          }));
        }
      } catch (error) {
        console.error("Lỗi lấy cấu hình:", error);
      }
    };
    fetchSettings();
  }, []);

  const storeName = settings.store_name;

  return (
    <div className="shipping-page-wrap">
      <Title level={2} className="shipping-main-title">
        CHÍNH SÁCH VẬN CHUYỂN VÀ GIAO HÀNG {storeName}
      </Title>

      <div className="shipping-content">
        <Title level={4} className="shipping-section-title">
          I. QUY ĐỊNH VỀ PHÍ GIAO HÀNG, KHU VỰC GIAO HÀNG, THỜI GIAN NHẬN HÀNG
        </Title>
        
        <div className="shipping-subsection">
          <Text strong className="shipping-sub-title">1. PHÍ GIAO HÀNG</Text>
          <ul className="shipping-list">
            <li>- <Text strong>{storeName} MIỄN PHÍ VẬN CHUYỂN</Text> đối với các đơn hàng có giá trị <Text strong>từ 200.000đ</Text> trở lên và khoảng cách giao hàng <Text strong>trong bán kính 5Km</Text>.</li>
            <li>- Phí giao hàng được áp dụng 5.000đ/Km đối với các đơn hàng có giá trị <Text strong>dưới 200.000đ</Text>.</li>
            <li>- Phí giao hàng được áp dụng 5.000đ/Km vượt đối với các đơn hàng có giá trị <Text strong>từ 200.000đ</Text> trở lên và khoảng cách giao hàng <Text strong>ngoài bán kính 5Km</Text>.</li>
          </ul>
        </div>

        <div className="shipping-subsection">
          <Text strong className="shipping-sub-title">2. KHU VỰC GIAO HÀNG</Text>
          <ul className="shipping-list">
            <li>- Khu vực Hà Nội, Hồ Chí Minh và các tỉnh thành phục vụ giao hàng trong bán kính 7Km (theo địa chỉ Khách hàng).</li>
            <li>- Đơn hàng sẽ được giao tới tận nhà của khách hàng, ngoại trừ các trường hợp như khu vực văn phòng hạn chế ra vào, khu vực chung cư/ cao tầng (chỉ phục vụ giao tại chân toà nhà).</li>
            <li>- <Text strong>{storeName}</Text> phục vụ giao hàng cả Thứ 7, Chủ Nhật và ngày Lễ.</li>
            <li className="shipping-list-long">- <Text strong>{storeName}</Text> phục vụ giao hàng theo các khu vực Hà Nội, Hồ Chí Minh, An Giang, Bắc Cạn, Bắc Ninh, Hòa Bình, Hải Dương, Hà Nam, Hải Phòng, Lai Châu, Lạng Sơn, Ninh Bình, Phú Thọ, Quảng Ninh, Sơn La, Thái Bình, Thanh Hóa, Thái Nguyên, Tuyên Quang, Yên Bái, Bình Dương, Bạc Liêu, Cà Mau, Cần Thơ, Đồng Nai, Đồng Tháp, Hậu Giang, Kiên Giang, Long An, Sóc Trăng, Tiền Giang, Tây Ninh, Trà Vinh, Vĩnh Long, Bà Rịa - Vũng Tàu, Bình Định, Đắk Lắk, Đà Nẵng, Gia Lai, Hà Tĩnh, Khánh Hòa, Kon Tum, Lâm Đồng, Nghệ An, Ninh Thuận, Phú Yên, Quảng Bình, Quảng Ngãi và Thừa Thiên Huế.</li>
          </ul>
        </div>

        <div className="shipping-subsection">
          <Text strong className="shipping-sub-title">3. THỜI GIAN GIAO HÀNG</Text>
          <ul className="shipping-list">
            <li>- Hàng sẽ được giao trong vòng 2 tiếng từ khi đơn hàng được xác nhận thành công. Các đơn hàng xác nhận sau 18:00 trong ngày, Khách hàng sẽ nhận hàng trước 12:00 sáng ngày hôm sau.</li>
            <li>- Thời gian giao hàng sẽ được {storeName} chủ động thay đổi trong trường hợp:
              <ul className="shipping-sublist">
                <li>• Quý khách không cung cấp chính xác, đầy đủ địa chỉ giao hàng và thông tin liên lạc trong quá trình đặt hàng.</li>
                <li>• Các trường hợp bất khả kháng: thiên tai, hỏa hoạn, cháy nổ... hoặc tuyến đường/ khung giờ cấm, hạn chế theo quy định của pháp luật và/hoặc chỉ đạo của cơ quan có thẩm quyền.</li>
              </ul>
            </li>
            <li>- Đơn hàng sẽ được giao tới tận nhà của khách hàng, ngoại trừ các trường hợp như khu vực văn phòng hạn chế ra vào, khu vực chung cư/ cao tầng (chỉ phục vụ giao tại chân toà nhà).</li>
            <li>- Trường hợp không liên lạc được với khách hàng, thời gian sẽ được thống nhất với khách hàng khi liên hệ được.</li>
            <li>- Trong trường hợp có phát sinh, {storeName} sẽ thông báo cho quý khách khung thời gian thay đổi phù hợp hơn qua các kênh thông tin: Gọi điện thoại / tin nhắn / email.</li>
            <li>- Hàng hóa của khách hàng sẽ được {storeName} hoặc đơn vị vận chuyển của {storeName} giao cho Khách hàng.</li>
            <li>- Không áp dụng vận chuyển đối với đơn hàng có giá trị từ 10 triệu đồng trở lên khi có nghi ngờ đầu cơ được xác nhận từ khối phòng ban liên quan.</li>
          </ul>
        </div>

        <Title level={4} className="shipping-section-title">
          II. QUY ĐỊNH KIỂM TRA HÀNG HÓA KHI GIAO HÀNG
        </Title>
        <div className="shipping-subsection">
          <ul className="shipping-list">
            <li>- <Text strong>{storeName}</Text> sẽ giao hàng nguyên đai, nguyên kiện cho Khách hàng và hỗ trợ việc kiểm tra các yếu tố bên ngoài của gói hàng như:
              <ul className="shipping-sublist">
                <li>• Phiếu giao hàng, tình trạng đóng gói, niêm phong các kiện hàng ...Việc kiểm tra sẽ không bao gồm mở seal (niêm phong) riêng của từng kiện hàng, từng sản phẩm gây ảnh hưởng đến tem dán niêm phong, bao bì sản phẩm...) hay kiểm tra sâu (cắm điện, sử dụng thử, ghi chép dữ liệu...).</li>
                <li>• Khách hàng khi nhận hàng sẽ ký vào hóa đơn thanh toán cho nhân viên giao nhận và giữ lại 1 liên hóa đơn bán hàng đi kèm.</li>
                <li>• Hàng hóa không được đóng gói cẩn thận, bị bóp méo, không nguyên vẹn và có tình trạng hư hỏng.</li>
                <li>• Giao hàng không đúng mặt hàng hoặc số lượng hàng mà khác hàng đã đặt.</li>
              </ul>
            </li>
            <li>- Hãy liên hệ chúng tôi khi Khách hàng cần được hỗ trợ:
              <ul className="shipping-sublist">
                <li>• Tổng đài chăm sóc khách hàng {storeName} Hotline: <Text strong style={{ color: '#d32f2f' }}>{settings.hotline}</Text> (Từ 8h - 21h)</li>
                <li>• Email: <Text strong style={{ color: '#d32f2f' }}>{settings.email}</Text></li>
              </ul>
            </li>
          </ul>
        </div>

        <Title level={3} className="shipping-footer-title">
          CHÂN THÀNH CẢM ƠN QUÝ KHÁCH
        </Title>
      </div>
    </div>
  );
};

export default ShippingPage;
