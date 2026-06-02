import React, { useState, useEffect } from "react";
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
  ShoppingCartOutlined,
  CarOutlined,
  LikeOutlined,
} from "@ant-design/icons";
import { categoryService } from "../../services/categoryService";
import axiosClient from "../../services/axiosClient";
import { getImageUrl } from "../../utils/imageHelper";
import "./Footer.css";

const Footer = () => {
  const [footerCategories, setFooterCategories] = useState([
    { category_id: 1, category_name: "Trái cây tươi" },
    { category_id: 2, category_name: "Rau củ sạch" },
    { category_id: 3, category_name: "Đồ uống" },
    { category_id: 4, category_name: "Sữa các loại" },
    { category_id: 5, category_name: "Thực phẩm khô" },
  ]);

  const [settings, setSettings] = useState({
    store_name: "EzyMart",
    hotline: "0349484515",
    email: "support@ezymart.com",
    address: "123 Phường Yên Nghĩa, TP.Hà Nội",
    slogan: "Thực phẩm sạch",
    footer_copyright: "© 2026 EzyMart. All rights reserved.",
    facebook_link: "https://facebook.com",
    zalo_link: "https://zalo.me",
    logo: "/images/EzyMart_final.png",
    open_time: "07:00",
    close_time: "22:00",
    free_ship_threshold: 200000
  });

  useEffect(() => {
    categoryService
      .getFooterCategories()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setFooterCategories(data);
        }
      })
      .catch(err => {
        console.error("Error fetching footer categories:", err);
      });
  }, []);

  // Gọi API lấy cấu hình hệ thống
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Thêm tham số ?t= timestamp để tránh trình duyệt cache lại kết quả cũ
        const timestamp = new Date().getTime();
        const res = await axiosClient.get(`/settings?t=${timestamp}`);
        if (res) {
          setSettings(prev => ({ ...prev, ...res, logo: res.logo || prev.logo }));
        }
      } catch (error) {
        console.error("Lỗi lấy cấu hình footer:", error);
      }
    };
    fetchSettings();
  }, []);

  const links = {
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
      {/* Trust Badges / Features */}
      <div className="footer-trust-badges-bar">
        <div className="footer-trust-badges-inner">
          <div className="footer-trust-item">
            <ShoppingCartOutlined className="footer-trust-icon" />
            <div className="footer-trust-info">
              <span className="footer-trust-title">Miễn phí vận chuyển</span>
              <span className="footer-trust-sub">
                Đơn hàng trên {settings.free_ship_threshold >= 1000 ? (settings.free_ship_threshold / 1000) + 'k' : settings.free_ship_threshold}
              </span>
            </div>
          </div>
          <div className="footer-trust-item">
            <CarOutlined className="footer-trust-icon" />
            <div className="footer-trust-info">
              <span className="footer-trust-title">Chuyển phát nhanh</span>
              <span className="footer-trust-sub">Trên khắp Việt Nam</span>
            </div>
          </div>
          <div className="footer-trust-item">
            <LikeOutlined className="footer-trust-icon" />
            <div className="footer-trust-info">
              <span className="footer-trust-title">Lựa chọn</span>
              <span className="footer-trust-sub">Nhiều sản phẩm</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand col */}
          <div className="footer-brand-col">
            <div className="footer-brand-header">
              <div className="footer-brand-logo">
                <img
                  src={getImageUrl(settings.logo)}
                  alt={`${settings.store_name} Logo`}
                  className="footer-logo-image"
                />
              </div>
              <div className="footer-brand-text">
                <span className="footer-brand-name">{settings.store_name}</span>
                <span className="footer-brand-tagline">{settings.slogan}</span>
              </div>
            </div>
            <p className="brand-desc">
              Hệ thống phân phối thực phẩm sạch, hữu cơ 100% tươi mới mỗi ngày.
              Cam kết chất lượng — Tốt cho sức khỏe gia đình bạn.
            </p>
            <div className="footer-social">
              <a href={settings.facebook_link} className="footer-social-btn" target="_blank" rel="noreferrer">
                <FacebookOutlined />
              </a>
              <button className="footer-social-btn"><InstagramOutlined /></button>
              <button className="footer-social-btn"><YoutubeOutlined /></button>
              <button className="footer-social-btn"><TwitterOutlined /></button>
            </div>
          </div>

          {/* Shop links */}
          <div>
            <div className="footer-col-title">Danh mục</div>
            <div className="footer-links">
              {footerCategories.map(item => (
                <Link key={item.category_id} to={`/category/${item.category_id}`}>
                  <RightOutlined className="footer-link-icon" /> {item.category_name}
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
              <span>{settings.address}</span>
            </div>
            <div className="footer-contact-item">
              <PhoneOutlined className="footer-contact-icon" />
              <span>Hotline: {settings.hotline}</span>
            </div>
            <div className="footer-contact-item">
              <MailOutlined className="footer-contact-icon" />
              <span>{settings.email}</span>
            </div>
            <div className="footer-contact-item">
              <ClockCircleOutlined className="footer-contact-icon" />
              <span>T2 – CN: {settings.open_time} – {settings.close_time}</span>
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
            {settings.footer_copyright}
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
