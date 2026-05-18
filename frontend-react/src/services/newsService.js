import axiosClient from './axiosClient';

/**
 * Service gọi API tin tức – dùng cho cả Public và Admin
 */
export const newsService = {
  // ─── Public ────────────────────────────────────────────────────────────────
  // Lấy danh sách tin tức đang hiển thị (status=1, mới nhất trước)
  getAll: () => axiosClient.get('/news'),

  // Lấy chi tiết tin theo news_id
  getById: (id) => axiosClient.get(`/news/${id}`),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  // Lấy tất cả (hỗ trợ filter: ?search=&status=)
  adminGetAll: (params = {}) => axiosClient.get('/news', { params }),

  // Tạo bài viết mới (FormData để upload ảnh)
  create: (formData) =>
    axiosClient.post('/news', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Cập nhật bài viết (FormData để hỗ trợ đổi ảnh)
  update: (id, formData) =>
    axiosClient.put(`/news/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Bật/tắt trạng thái nhanh
  updateStatus: (id, status) =>
    axiosClient.patch(`/news/${id}/status`, { status }),

  // Xóa bài viết
  delete: (id) => axiosClient.delete(`/news/${id}`),
};
