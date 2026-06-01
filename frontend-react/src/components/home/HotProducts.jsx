import React, { useState, useEffect } from "react";
import { Spin, Button } from "antd";
import { ArrowRightOutlined, FireFilled } from "@ant-design/icons";
import { Link } from "react-router-dom";
import axiosClient from "../../services/axiosClient";
import ProductCard from "../product/ProductCard";
import "./HotProducts.css";

const HotProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleLimit, setVisibleLimit] = useState(10);

  useEffect(() => {
    // Hàm gọi API lấy danh sách sản phẩm hot
    const fetchHotProducts = async () => {
      try {
        setLoading(true);
        // Gọi endpoint GET /api/products/hot
        const response = await axiosClient.get("/products/hot");
        if (response && Array.isArray(response)) {
          setProducts(response);
        }
      } catch (error) {
        console.error("Lỗi khi tải sản phẩm nổi bật:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotProducts();
  }, []);

  // Trạng thái Loading
  if (loading) {
    return (
      <div className="loading-center">
        <Spin size="large" tip="Đang tải sản phẩm nổi bật..." />
      </div>
    );
  }

  // Ẩn khối nếu không có sản phẩm nào
  if (!products || products.length === 0) {
    return null;
  }

  const displayedProducts = products.slice(0, visibleLimit);
  const remainingCount = products.length - visibleLimit;

  return (
    <div className="home-category-section">
      <div className="section-header">
        <h2 className="section-title hot-products-title">
          Sản Phẩm Bán Chạy <FireFilled className="hot-products-icon" />
        </h2>
        <Link to="/category/all?hot=1" className="section-link">
          Xem thêm <ArrowRightOutlined />
        </Link>
      </div>

      <div className="products-grid">
        {displayedProducts.map((product) => (
          <ProductCard key={product.product_id} product={product} />
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="load-more-wrap">
          <Button
            onClick={() => setVisibleLimit((prev) => prev + 10)}
            className="home-load-more-btn"
          >
            Xem thêm (còn lại {remainingCount} sản phẩm)
          </Button>
        </div>
      )}
    </div>
  );
};

export default HotProducts;
