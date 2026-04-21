import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Spin, Empty } from 'antd';
import { CalendarOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { newsService } from '../../services/newsService';
import './News.css';

/**
 * Định dạng ngày tháng sang tiếng Việt
 * @param {string} dateStr - chuỗi datetime từ DB
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Trang danh sách tin tức
 * Route: /news
 */
const NewsListPage = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const res = await newsService.getAll();
        // axiosClient trả về response.data → res = { success, data }
        if (res?.success) {
          setNewsList(res.data);
        }
      } catch (err) {
        console.error('Lỗi lấy danh sách tin tức:', err);
        setError('Không thể tải tin tức. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="news-page">
      {/* Page Header */}
      <div className="news-page-header">
        <div className="news-header-inner">
          <h1 className="news-page-title">📰 Tin Tức</h1>
          <p className="news-page-subtitle">
            Cập nhật những tin tức mới nhất về sản phẩm và khuyến mãi
          </p>
        </div>
      </div>

      <div className="news-container">
        {/* Loading */}
        {loading && (
          <div className="news-loading">
            <Spin size="large" tip="Đang tải tin tức..." />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="news-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && newsList.length === 0 && (
          <Empty description="Chưa có tin tức nào" />
        )}

        {/* News Grid */}
        {!loading && !error && newsList.length > 0 && (
          <div className="news-grid">
            {newsList.map((item) => (
              <Link
                to={`/news/${item.news_id}`}
                key={item.news_id}
                className="news-card"
              >
                {/* Ảnh thumbnail */}
                <div className="news-card-image-wrap">
                  {item.image ? (
                    <img
                      src={`http://localhost:5000/uploads/${item.image}`}
                      alt={item.title}
                      className="news-card-image"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/600x400?text=EzyMart+News';
                      }}
                    />
                  ) : (
                    <div className="news-card-image-placeholder">📰</div>
                  )}
                  <div className="news-card-overlay">
                    <span>Đọc thêm <ArrowRightOutlined /></span>
                  </div>
                </div>

                {/* Nội dung card */}
                <div className="news-card-body">
                  <div className="news-card-date">
                    <CalendarOutlined />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <h2 className="news-card-title">{item.title}</h2>
                  {item.description && (
                    <p className="news-card-desc">{item.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsListPage;
