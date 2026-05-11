import React from "react";
import { Link } from "react-router-dom";
import { Card, Button, message, Typography, Tooltip } from "antd";
import { ShoppingCartOutlined, EyeOutlined } from "@ant-design/icons";
import { cartService } from "../../services/cartService";
import { useAuth } from "../../context/AuthContext";
import "./ProductCard.css";

const { Text } = Typography;
import { formatCurrency } from "../../utils";
const IMAGE_BASE = "/images/";
const UPLOAD_BASE = "http://localhost:5000/uploads/";

const ProductCard = ({ product }) => {
  const { user } = useAuth();

  const defaultVariant = product.variants?.[0] || {};
  const price = defaultVariant.variant_price || 0;
  const discountPrice = defaultVariant.variant_discount || 0;

  const handleAddToCart = async e => {
    e.preventDefault();
    e.stopPropagation();
    if (!defaultVariant.variant_id) {
       message.error("Sản phẩm chưa có biến thể nào!");
       return;
    }
    try {
      await cartService.addToCart({
        product_id: product.product_id,
        variant_id: defaultVariant.variant_id,
        quantity: 1,
        user_id: user?.user_id,
      });
      message.success({
        content: `Đã thêm "${product.product_name}" vào giỏ`,
        style: { marginTop: 60 },
      });
    } catch {
      message.error("Lỗi thêm vào giỏ hàng");
    }
  };

  const hasDiscount = discountPrice && Number(discountPrice) > 0 && Number(discountPrice) < Number(price);
  const displayPrice = hasDiscount ? discountPrice : price;
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(discountPrice) / Number(price)) * 100)
    : 0;

  // Xác định tên file ảnh (ưu tiên product_image, nếu không có thì lấy ảnh đầu tiên trong mảng images)
  const targetImage = product.product_image || (product.images && product.images.length > 0 ? product.images[0].image_url : null);

  const getInitialImgSrc = (filename) => {
    if (!filename) return "/placeholder.png";
    if (filename.startsWith("http")) return filename;
    // Thử UPLOAD_BASE trước (ảnh mới thêm), nếu lỗi sẽ fallback về IMAGE_BASE (ảnh seed)
    return `${UPLOAD_BASE}${filename}`;
  };

  const imgSrc = getInitialImgSrc(targetImage);

  return (
    <div className="product-card-wrap">
      <Card
        className="product-card"
        hoverable
        styles={{ body: { padding: 0 } }}
        cover={
          <div className="product-card-cover">
            {/* Discount badge */}
            {hasDiscount && (
              <div className="product-badge">-{discountPercent}%</div>
            )}
            <Link to={`/product/${product.product_id}`}>
              <img
                className="product-card-img"
                src={imgSrc}
                alt={product.product_name}
                onError={e => {
                  if (!targetImage) return; // Nếu không có ảnh, để nguyên (sẽ hiển thị broken image hoặc fallback của browser)
                  
                  // Dùng dataset để đánh dấu đã thử fallback, tránh lặp vô hạn
                  if (e.target.dataset.fallbackTried) {
                     if (!e.target.src.includes("placeholder")) {
                         e.target.src = "/placeholder.png";
                     }
                     return;
                  }
                  e.target.dataset.fallbackTried = "true";
                  e.target.src = `${IMAGE_BASE}${targetImage}`;
                }}
              />
            </Link>
            {/* Hover overlay */}
            <div className="product-card-overlay">
              <Link
                to={`/product/${product.product_id}`}
                className="product-card-overlay-btn"
              >
                <EyeOutlined style={{ marginRight: 6 }} /> Xem chi tiết
              </Link>
            </div>
          </div>
        }
      >
        <div className="product-card-body">
          <Link to={`/product/${product.product_id}`}>
            <div className="product-card-name">{product.product_name}</div>
          </Link>
          <div className="product-card-footer">
            <div className="product-card-prices">
              <span className="product-card-price">
                {formatCurrency(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="product-card-original">
                  {formatCurrency(price)}
                </span>
              )}
            </div>
            <Tooltip title="Thêm vào giỏ">
              <button
                className="product-card-add-btn"
                onClick={handleAddToCart}
              >
                <ShoppingCartOutlined />
              </button>
            </Tooltip>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProductCard;
