import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Spin, Tooltip, message } from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  UserOutlined,
  CloseOutlined,
  ShoppingCartOutlined,
  LikeOutlined,
  DislikeOutlined,
  LikeFilled,
  DislikeFilled,
  LoadingOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axiosClient from '../../services/axiosClient';
import { cartService } from '../../services/cartService';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/imageHelper';
import './ChatbotDrawer.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatVND = (price) =>
  Number(price).toLocaleString('vi-VN') + 'đ';

// Bold: prices like 29.000đ, combo names in format "Tên Combo", and **bold** markers
const renderBotText = (text, combos = []) => {
  if (!text) return null;
  const comboNames = combos?.map((c) => c.comboName).filter(Boolean) || [];

  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const patterns = [
    '\\d[\\d.,]*\\s*đ', // prices
    '\\*\\*[^*]+\\*\\*', // **bold**
    '"[^"]+"', // quoted strings
  ];

  if (comboNames.length > 0) {
    patterns.push(...comboNames.map(escapeRegex));
  }

  const regex = new RegExp(`(${patterns.join('|')})`, 'g');

  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (!part) return null;
    if (/^\d[\d.,]*\s*đ$/.test(part)) {
      return <strong key={i} className="cb-highlight">{part}</strong>;
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i} className="cb-highlight">{part.replace(/^\*\*|\*\*$/g, '')}</strong>;
    }
    if (/^"[^"]+"$/.test(part)) {
      return (
        <strong key={i} className="cb-highlight cb-highlight--combo">
          {part.replace(/^"|"$/g, '')}
        </strong>
      );
    }
    if (comboNames.includes(part)) {
      return (
        <strong key={i} className="cb-highlight cb-highlight--combo">
          {part}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const BotAvatar = () => (
  <div className="cb-avatar cb-avatar--bot">
    <img
      src="/images/EzyMart_final.png"
      alt="EzyMart Bot"
      className="cb-avatar-logo"
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  </div>
);

const UserAvatar = () => (
  <div className="cb-avatar cb-avatar--user">
    <UserOutlined style={{ fontSize: 14 }} />
  </div>
);

const ProductMiniCard = ({ product, user }) => {
  const [adding, setAdding] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.default_variant_id) {
      message.warning('Sản phẩm chưa có biến thể!');
      return;
    }
    setAdding(true);
    try {
      await cartService.addToCart({
        product_id: product.product_id,
        variant_id: product.default_variant_id,
        quantity: 1,
        user_id: user?.user_id,
      });
      message.success({ content: `Đã thêm "${product.product_name}" vào giỏ 🛒`, style: { marginTop: 60 } });
    } catch {
      message.error('Không thể thêm vào giỏ hàng');
    } finally {
      setAdding(false);
    }
  };

  const imgSrc = getImageUrl(product.product_image);

  return (
    <div className="cb-product-card">
      <Link to={`/product/${product.product_id}`} className="cb-product-card__img-wrap">
        <img
          src={imgSrc}
          alt={product.product_name}
          className="cb-product-card__img"
          onError={(e) => { e.target.src = '/placeholder.png'; }}
        />
        {product.has_discount && (
          <span className="cb-product-card__badge">
            -{Math.round((1 - product.display_price / product.original_price) * 100)}%
          </span>
        )}
      </Link>
      <div className="cb-product-card__body">
        <Link to={`/product/${product.product_id}`} className="cb-product-card__name">
          {product.product_name}
        </Link>
        <div className="cb-product-card__prices">
          <span className="cb-product-card__price">{formatVND(product.display_price)}</span>
          {product.has_discount && (
            <span className="cb-product-card__original">{formatVND(product.original_price)}</span>
          )}
        </div>
        <button className="cb-product-card__btn" onClick={handleAddToCart} disabled={adding}>
          <ShoppingCartOutlined />
          {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
        </button>
      </div>
    </div>
  );
};

// ─── Combo Group Card ─────────────────────────────────────────────────────────────────────────
const ComboGroupCard = ({ combo, user }) => {
  const [addingAll, setAddingAll] = useState(false);

  const handleAddCombo = async () => {
    const validItems = combo.items.filter(p => p.default_variant_id);
    if (validItems.length === 0) {
      message.warning('Combo chưa có sản phẩm hợp lệ!');
      return;
    }
    setAddingAll(true);
    try {
      // Thêm tuần tự để tránh race condition trên giỏ hàng
      for (const p of validItems) {
        await cartService.addToCart({
          product_id: p.product_id,
          variant_id: p.default_variant_id,
          quantity: 1,
          user_id: user?.user_id,
        });
      }
      message.success({
        content: `Đã thêm toàn bộ Combo "${combo.comboName}" vào giỏ hàng! 🛒`,
        style: { marginTop: 60 },
      });
    } catch {
      message.error('Không thể thêm Combo vào giỏ hàng');
    } finally {
      setAddingAll(false);
    }
  };

  const VISIBLE_COUNT = 3; // max items shown before "scroll for more" hint

  return (
    <div className="cb-combo-group">
      {/* Combo header */}
      <div className="cb-combo-group__header">
        <span className="cb-combo-group__name">{combo.comboName}</span>
        <span className="cb-combo-group__count">{combo.items.length} sản phẩm</span>
      </div>

      {/* Product grid (horizontal scroll) */}
      <div className="cb-combo-group__items">
        {combo.items.map((p) => (
          <div key={p.product_id} className="cb-combo-item">
            <Link to={`/product/${p.product_id}`} className="cb-combo-item__img-wrap">
              <img
                src={getImageUrl(p.product_image)}
                alt={p.product_name}
                className="cb-combo-item__img"
                onError={(e) => { e.target.src = '/placeholder.png'; }}
              />
              {p.has_discount && (
                <span className="cb-combo-item__badge">
                  -{Math.round((1 - p.display_price / p.original_price) * 100)}%
                </span>
              )}
            </Link>
            {/* Name: clamp 2 lines + ellipsis, fixed height to keep layout stable */}
            <Link to={`/product/${p.product_id}`} className="cb-combo-item__name" title={p.product_name}>
              {p.product_name}
            </Link>
            <div className="cb-combo-item__prices">
              <span className="cb-combo-item__price">{formatVND(p.display_price)}</span>
              {p.has_discount && (
                <span className="cb-combo-item__original">{formatVND(p.original_price)}</span>
              )}
            </div>
          </div>
        ))}

        {/* "More items" hint slot when > VISIBLE_COUNT */}
        {combo.items.length > VISIBLE_COUNT && (
          <div className="cb-combo-item cb-combo-item--more">
            <div className="cb-combo-item__more-circle">
              +{combo.items.length - VISIBLE_COUNT}
            </div>
            <span className="cb-combo-item__more-label">Kéo xem<br/>thêm</span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="cb-combo-group__divider" />

      {/* Add entire combo button */}
      <button
        className="cb-combo-group__add-btn"
        onClick={handleAddCombo}
        disabled={addingAll}
      >
        <ShoppingCartOutlined />
        {addingAll ? 'Đang thêm cả combo...' : 'Thêm nhanh combo vào giỏ'}
      </button>
    </div>
  );
};

const FeedbackButtons = ({ msgId, onFeedback }) => {
  const [voted, setVoted] = useState(null); // 'like' | 'dislike' | null

  const handleVote = (type) => {
    if (voted === type) return;
    setVoted(type);
    onFeedback?.(msgId, type);
  };

  return (
    <div className="cb-feedback">
      <Tooltip title="Phản hồi để AI thông minh hơn" placement="top">
        <button
          className={`cb-feedback__btn ${voted === 'like' ? 'active like' : ''}`}
          onClick={() => handleVote('like')}
        >
          {voted === 'like' ? <LikeFilled /> : <LikeOutlined />}
        </button>
      </Tooltip>
      <Tooltip title="Phản hồi để AI thông minh hơn" placement="top">
        <button
          className={`cb-feedback__btn ${voted === 'dislike' ? 'active dislike' : ''}`}
          onClick={() => handleVote('dislike')}
        >
          {voted === 'dislike' ? <DislikeFilled /> : <DislikeOutlined />}
        </button>
      </Tooltip>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ChatbotDrawer = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Chào bạn! 👋 Mình là Trợ lý ảo của **EzyMart**. Mình có thể giúp gì cho bạn hôm nay?',
      sender: 'bot',
      products: [],
      comboProducts: [],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const getTimeSlot = () => {
    const hour = new Date().getHours();
    if (hour >= 6  && hour < 11) return 'Sáng';
    if (hour >= 11 && hour < 14) return 'Trưa';
    if (hour >= 14 && hour < 18) return 'Chiều';
    if (hour >= 18 && hour < 22) return 'Tối';
    return 'Khuya';
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = { id: Date.now(), text: inputValue.trim(), sender: 'user', products: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await axiosClient.post('/chatbot/chat', {
        message: userMsg.text,
        timeSlot: getTimeSlot(),
      });

      const botMsg = {
        id: Date.now() + 1,
        text: response.reply,
        sender: 'bot',
        products: response.products || [],
        comboProducts: response.comboProducts || [],
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: 'Hệ thống Trợ lý ảo đang bận một chút, bạn vui lòng thử lại sau nhé! 🙏',
          sender: 'bot',
          products: [],
          comboProducts: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = (msgId, type) => {
    // Could be extended to call an analytics endpoint
    console.log(`[Chatbot Feedback] msg=${msgId} vote=${type}`);
  };

  return (
    <>
      {/* ── Floating Button ── */}
      {!isOpen && (
        <button
          id="chatbot-open-btn"
          className="cb-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Mở trợ lý ảo EzyMart"
        >
          <MessageOutlined className="cb-fab__icon" />
          <span className="cb-fab__pulse" />
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="cb-window" role="dialog" aria-label="Trợ lý ảo EzyMart">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header__left">
              <div className="cb-header__logo-wrap">
                <img
                  src="/images/EzyMart_final.png"
                  alt="EzyMart"
                  className="cb-header__logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div className="cb-header__info">
                <span className="cb-header__name">Trợ lý ảo EzyMart</span>
                <span className="cb-header__status">
                  <span className="cb-header__dot" /> Đang hoạt động
                </span>
              </div>
            </div>
            <Button
              type="text"
              icon={<CloseOutlined style={{ color: '#fff', fontSize: 14 }} />}
              onClick={() => setIsOpen(false)}
              className="cb-header__close"
              aria-label="Đóng chatbot"
            />
          </div>

          {/* Messages */}
          <div className="cb-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`cb-row cb-row--${msg.sender}`}>
                {/* Bot avatar LEFT */}
                {msg.sender === 'bot' && <BotAvatar />}

                <div className="cb-col">
                  {/* Bubble */}
                  <div className={`cb-bubble cb-bubble--${msg.sender}`}>
                    <p className="cb-bubble__text">{renderBotText(msg.text, msg.comboProducts)}</p>
                  </div>

                  {/* Product mini cards (only for bot) */}
                  {msg.sender === 'bot' && msg.products?.length > 0 && (
                    <div className="cb-products">
                      {msg.products.map((p) => (
                        <ProductMiniCard key={p.product_id} product={p} user={user} />
                      ))}
                    </div>
                  )}

                  {/* Combo group cards (only for bot when combo query) */}
                  {msg.sender === 'bot' && msg.comboProducts?.length > 0 && (
                    <div className="cb-combos">
                      {msg.comboProducts.map((combo, idx) => (
                        <ComboGroupCard key={idx} combo={combo} user={user} />
                      ))}
                    </div>
                  )}

                  {/* Feedback (only for bot) */}
                  {msg.sender === 'bot' && msg.id !== 1 && (
                    <FeedbackButtons msgId={msg.id} onFeedback={handleFeedback} />
                  )}
                </div>

                {/* User avatar RIGHT */}
                {msg.sender === 'user' && <UserAvatar />}
              </div>
            ))}

            {/* Typing indicator — context-aware label */}
            {loading && (
              <div className="cb-row cb-row--bot">
                <BotAvatar />
                <div className="cb-bubble cb-bubble--bot cb-bubble--typing">
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 16, color: '#16a34a' }} spin />} />
                  <span className="cb-typing-label">Trợ lý đang tìm kiếm...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="cb-input-area">
            <Input
              id="chatbot-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Hỏi mình bất cứ điều gì..."
              className="cb-input"
              disabled={loading}
              suffix={
                <Button
                  type="primary"
                  shape="circle"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={!inputValue.trim() || loading}
                  className="cb-send-btn"
                />
              }
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotDrawer;
