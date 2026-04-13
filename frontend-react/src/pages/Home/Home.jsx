import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, Spin, Tag } from "antd";
import {
  ArrowRightOutlined,
  FireOutlined,
  AppleOutlined,
} from "@ant-design/icons";
import ProductCard from "../../components/product/ProductCard";
import { productService } from "../../services/productService";
import { categoryService } from "../../services/categoryService";
import "./Home.css";

/* ── Animated Hero Slider ── */
const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const slides = [
    {
      cls: "hero-slide-1",
      badge: "🌿 100% Tự nhiên",
      title: (
        <>
          <span>SUMMER</span>
          <br />
          GIẢM GIÁ LỚN
        </>
      ),
      desc: "Giảm 40% cho các loại trái cây và rau củ xanh sạch, trực tiếp từ nông trại Việt Nam.",
      cta: "Mua ngay",
      ctaLink: "/#products",
    },
    {
      cls: "hero-slide-2",
      badge: "✨ Thực phẩm thượng hạng",
      title: (
        <>
          <span>TƯƠI</span>
          <br />
          MỖI NGÀY
        </>
      ),
      desc: "Chúng tôi cam kết 100% thực phẩm tươi, giao ngay trong ngày tại Hà Nội.",
      cta: "Khám phá",
      ctaLink: "/category/1",
    },
    {
      cls: "hero-slide-3",
      badge: "🚚 Miễn phí vận chuyển",
      title: (
        <>
          <span>GIAO HÀNG</span>
          <br />
          SIÊU NHANH
        </>
      ),
      desc: "Giao hàng trong 2 giờ tại Hà Nội. Đặt hàng trước 11h nhận hàng trong ngày.",
      cta: "Đặt ngay",
      ctaLink: "/",
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const s = slides[current];

  return (
    <div className="hero-slider home-slider-wrap">
      <div className={`hero-slide ${s.cls}`}>
        <div className="hero-content">
          <div className="hero-badge">{s.badge}</div>
          <h1 className="hero-title">{s.title}</h1>
          <p className="hero-desc">{s.desc}</p>
          <div className="hero-actions">
            <Link to={s.ctaLink} className="hero-btn-primary">
              {s.cta} <ArrowRightOutlined />
            </Link>
            <Link to="/category/1" className="hero-btn-secondary">
              Xem tất cả
            </Link>
          </div>
        </div>
      </div>
      {/* Controls */}
      <button
        className="hero-arrow hero-arrow-left"
        onClick={() => setCurrent(c => (c - 1 + slides.length) % slides.length)}
      >
        ‹
      </button>
      <button
        className="hero-arrow hero-arrow-right"
        onClick={() => setCurrent(c => (c + 1) % slides.length)}
      >
        ›
      </button>
      <div className="hero-dots">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`hero-dot ${i === current ? "active" : ""}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </div>
  );
};

/* ── Features Strip ── */
const FeaturesStrip = () => (
  <div className="features-strip">
    <div className="features-inner">
      {[
        {
          icon: "🚚",
          title: "Giao hàng nhanh",
          desc: "Trong 2 giờ tại TP.HCM",
        },
        {
          icon: "✅",
          title: "100% Thực phẩm sạch",
          desc: "Cam kết tươi mới mỗi ngày",
        },
        {
          icon: "🔄",
          title: "Đổi trả dễ dàng",
          desc: "Hoàn tiền trong 7 ngày",
        },
        {
          icon: "💳",
          title: "Thanh toán an toàn",
          desc: "COD & ATM & Ví điện tử",
        },
      ].map((f, i) => (
        <div className="feature-item" key={i}>
          <div className="feature-icon">{f.icon}</div>
          <div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Home Page ── */
const Home = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          productService.getAll(),
          categoryService.getAll(),
        ]);
        if (prodRes) setProducts(prodRes);
        if (catRes) setCategories(catRes);
      } catch (e) {
        console.error("Error loading home data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div id="products">
      {/* Banner */}
      <HeroSlider />

      {/* Features */}
      <FeaturesStrip />

      {/* Products by Category */}
      <div className="home-categories-wrap">
        <div className="page-wrap">
          {loading ? (
            <div className="loading-center">
              <Spin size="large" tip="Đang tải sản phẩm..." />
            </div>
          ) : (
            categories.map(cat => {
              const catProducts = products.filter(
                p => p.category_id === cat.category_id,
              );
              if (catProducts.length === 0) return null;
              return (
                <div key={cat.category_id} className="home-category-section">
                  <div className="section-header">
                    <h2 className="section-title">{cat.category_name}</h2>
                    <Link
                      to={`/category/${cat.category_id}`}
                      className="section-link"
                    >
                      Xem thêm <ArrowRightOutlined />
                    </Link>
                  </div>
                  <div className="products-grid">
                    {catProducts.slice(0, 6).map(p => (
                      <ProductCard key={p.product_id} product={p} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
