import axiosClient from './axiosClient';

export const brandService = {
    getAll: () => axiosClient.get('/brands'),
    getById: (id) => axiosClient.get(`/brands/${id}`),
    create: (formData) => axiosClient.post('/brands', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    update: (id, formData) => axiosClient.put(`/brands/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    delete: (id) => axiosClient.delete(`/brands/${id}`)
};

