import axiosClient from './axiosClient';

export const userService = {
    getById: (id) => axiosClient.get(`/users/${id}`),
    updateProfile: (id, data) => axiosClient.put(`/users/${id}`, data),
    changePassword: (id, data) => axiosClient.put(`/users/${id}/password`, data),
    // Admin
    getAllUsers: () => axiosClient.get('/users'),
    getAllCustomers: () => axiosClient.get('/users/admin/customers'),
};
