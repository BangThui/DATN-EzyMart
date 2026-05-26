import axiosClient from './axiosClient';

export const categoryService = {
    getAll: () => axiosClient.get('/categories'),
    getTree: () => axiosClient.get('/categories/tree'),
    getFooterCategories: () => axiosClient.get('/categories/footer'),
    getById: (id) => axiosClient.get(`/categories/${id}`),
    // Admin
    create: (data) => axiosClient.post('/categories', data),
    update: (id, data) => axiosClient.put(`/categories/${id}`, data),
    delete: (id) => axiosClient.delete(`/categories/${id}`),
};
