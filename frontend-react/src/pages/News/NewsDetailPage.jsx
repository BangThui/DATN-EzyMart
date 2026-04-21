import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spin, Breadcrumb } from 'antd';
import { CalendarOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { newsService } from '../../services/newsService';
import './News.css';

/**
 * Định dạng ngày giờ đầy đủ sang tiếng Việt
 * @param {string} dateStr - chuỗi datetime từ DB
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Trang chi tiết tin tức
 * Route: /news/:id
 */
const NewsDetailPage = () => {
  const { id } = useParams();
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNewsDetail = async () => {
      try {
        setLoading(true);
        const res = await newsService.getById(id);
        // axiosClient trả về response.data → res = { success, data }
        if (res?.success) {
          setNews(res.data);
        } else {
          setError('Không tìm thấy tin tức.');
        }
      } catch (err) {
        console.error('Lỗi lấy chi tiết tin tức:', err);
        setError('Không thể tải tin tức. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchNewsDetail();
  }, [id]); // Re-fetch khi id thay đổi

  return (
    <div className="news-page">
      <div className="news-container">
        {/* Breadcrumb điều hướng */}
        <Breadcrumb
          className="news-breadcrumb"
          items={[
            { title: <Link to="/">Trang chủ</Link> },
            { title: <Link to="/news">Tin tức</Link> },
            { title: news?.title || 'Chi tiết' },
          ]}
        />

        {/* Loading */}
        {loading && (
          <div className="news-loading">
            <Spin size="large" tip="Đang tải bài viết..." />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="news-error">
            <span>⚠️ {error}</span>
            <Link to="/news" className="news-back-btn">
              <ArrowLeftOutlined /> Quay lại danh sách
            </Link>
          </div>
        )}

        {/* Nội dung chi tiết */}
        {!loading && !error && news && (
          <article className="news-detail">
            {/* Header */}
            <header className="news-detail-header">
              <h1 className="news-detail-title">{news.title}</h1>
              <div className="news-detail-meta">
                <span className="news-detail-date">
                  <CalendarOutlined />
                  &nbsp;{formatDateTime(news.created_at)}
                </span>
              </div>
              {news.description && (
                <p className="news-detail-desc">{news.description}</p>
              )}
            </header>

            {/* Ảnh đại diện */}
            {news.image && (
              <div className="news-detail-image-wrap">
                <img
                  src={`http://localhost:5000/uploads/${news.image}`}
                  alt={news.title}
                  className="news-detail-image"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/1200x500?text=EzyMart+News';
                  }}
                />
              </div>
            )}

            {/* Nội dung HTML từ DB */}
            <div
              className="news-detail-content"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />

            {/* Back button */}
            <div className="news-detail-footer">
              <Link to="/news" className="news-back-btn">
                <ArrowLeftOutlined /> Quay lại danh sách tin tức
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default NewsDetailPage;
