import React from "react";
import { Link } from "react-router-dom";
import {
  FacebookOutlined,
  InstagramOutlined,
  YoutubeOutlined,
  TwitterOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  ClockCircleOutlined,
  RightOutlined,
} from "@ant-design/icons";
import "./Footer.css";

const Footer = () => {
  const links = {
    shop: [
      { label: "Trái cây tươi", path: "/category/1" },
      { label: "Rau củ sạch", path: "/category/2" },
      { label: "Đồ uống", path: "/category/3" },
      { label: "Sữa các loại", path: "/category/4" },
      { label: "Thực phẩm khô", path: "/category/5" },
    ],
    support: [
      { label: "Về chúng tôi", path: "/about" },
      { label: "Chính sách vận chuyển", path: "/shipping" },
      { label: "Chính sách đổi trả", path: "/returns" },
      { label: "Câu hỏi thường gặp", path: "/faq" },
      { label: "Liên hệ", path: "/contact" },
    ],
  };

  return (
    <footer className="footer-wrap">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand col */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              {/* <div className="footer-brand-logo">
                <img
                  src="/images/EzyMart_final.png"
                  alt="EzyMart Logo"
                  className="footer-logo-image"
                />
              </div> */}
              <div className="footer-brand-text">
                <span className="footer-brand-name">EzyMart</span>
                <span className="footer-brand-tagline">THỰC PHẨM SẠCH</span>
              </div>
            </div>
            <p className="brand-desc">
              Hệ thống phân phối thực phẩm sạch, hữu cơ 100% tươi mới mỗi ngày.
              Cam kết chất lượng — Tốt cho sức khỏe gia đình bạn.
            </p>
            <div className="footer-social">
              {[
                FacebookOutlined,
                InstagramOutlined,
                YoutubeOutlined,
                TwitterOutlined,
              ].map((Icon, i) => (
                <button key={i} className="footer-social-btn">
                  <Icon />
                </button>
              ))}
            </div>
          </div>

          {/* Shop links */}
          <div>
            <div className="footer-col-title">Danh mục</div>
            <div className="footer-links">
              {links.shop.map(l => (
                <Link key={l.path} to={l.path}>
                  <RightOutlined className="footer-link-icon" /> {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support links */}
          <div>
            <div className="footer-col-title">Hỗ trợ</div>
            <div className="footer-links">
              {links.support.map(l => (
                <Link key={l.path} to={l.path}>
                  <RightOutlined className="footer-link-icon" /> {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact + newsletter */}
          <div>
            <div className="footer-col-title">Liên hệ</div>
            <div className="footer-contact-item">
              <EnvironmentOutlined className="footer-contact-icon" />
              <span>123 Đường Organic, Quận 1, TP.HCM</span>
            </div>
            <div className="footer-contact-item">
              <PhoneOutlined className="footer-contact-icon" />
              <span>Hotline: 1800 6789 (Miễn phí)</span>
            </div>
            <div className="footer-contact-item">
              <MailOutlined className="footer-contact-icon" />
              <span>info@ezymart.vn</span>
            </div>
            <div className="footer-contact-item">
              <ClockCircleOutlined className="footer-contact-icon" />
              <span>T2 – CN: 7:00 – 22:00</span>
            </div>

            <div className="footer-newsletter-wrap">
              <div className="footer-col-title footer-newsletter-title">
                ĐĂNG KÝ NHẬN ƯU ĐÃI
              </div>
              <div className="footer-newsletter-input">
                <input type="email" placeholder="Email của bạn..." />
                <button className="footer-newsletter-btn">Đăng ký</button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <span className="footer-bottom-text">
            © 2024 EzyMart. All rights reserved.
          </span>
          <div className="footer-bottom-links">
            <Link to="/privacy">Chính sách bảo mật</Link>
            <Link to="/terms">Điều khoản sử dụng</Link>
            <Link to="/sitemap">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
