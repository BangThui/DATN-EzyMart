import axiosClient from './axiosClient';

export const categoryService = {
    getAll: () => axiosClient.get('/categories'),
    getById: (id) => axiosClient.get(`/categories/${id}`),
    // Admin
    create: (data) => axiosClient.post('/categories', data),
    update: (id, data) => axiosClient.put(`/categories/${id}`, data),
    delete: (id) => axiosClient.delete(`/categories/${id}`),
};
