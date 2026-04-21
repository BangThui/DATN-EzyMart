import axiosClient from './axiosClient';

export const productService = {
    getAll: (params) => axiosClient.get('/products', { params }),
    getById: (id) => axiosClient.get(`/products/${id}`),
    getSimilar: (category_id, current_id) =>
        axiosClient.get('/products/similar', { params: { category_id, current_id } }),
    search: (keyword) => axiosClient.get('/products', { params: { search: keyword } }),
    // Admin
    getTrash: () => axiosClient.get('/products/deleted/trash'),
    create: (formData) => axiosClient.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, formData) => axiosClient.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    updateStatus: (id, status) => axiosClient.patch(`/products/${id}/status`, { status }),
    softDelete: (id) => axiosClient.patch(`/products/${id}/soft-delete`),
    restore: (id) => axiosClient.patch(`/products/${id}/restore`),
    hardDelete: (id) => axiosClient.delete(`/products/${id}`),
};
