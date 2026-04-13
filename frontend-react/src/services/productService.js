import axiosClient from './axiosClient';

export const productService = {
    getAll: (params) => axiosClient.get('/products', { params }),
    getById: (id) => axiosClient.get(`/products/${id}`),
    getSimilar: (category_id, current_id) =>
        axiosClient.get('/products/similar', { params: { category_id, current_id } }),
    search: (keyword) => axiosClient.get('/products', { params: { search: keyword } }),
    // Admin
    create: (formData) => axiosClient.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id, formData) => axiosClient.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => axiosClient.delete(`/products/${id}`),
};
