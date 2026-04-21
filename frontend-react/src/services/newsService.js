import axiosClient from './axiosClient';

/**
 * Service gọi API tin tức
 */
export const newsService = {
  // Lấy danh sách tin tức (status=1, DESC by created_at)
  getAll: () => axiosClient.get('/news'),

  // Lấy chi tiết tin theo news_id
  getById: (id) => axiosClient.get(`/news/${id}`),
};
