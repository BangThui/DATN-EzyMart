import axiosClient from './axiosClient';

export const userService = {
    getById: (id) => axiosClient.get(`/users/${id}`),
    updateProfile: (id, data) => axiosClient.put(`/users/${id}`, data),
    changePassword: (id, data) => axiosClient.put(`/users/${id}/password`, data),
    // Admin
    getAllUsers: () => axiosClient.get('/users'),
    createUser: (data) => axiosClient.post('/users/admin', data),
    updateUserByAdmin: (id, data) => axiosClient.put(`/users/admin/${id}`, data),
    deleteUser: (id) => axiosClient.delete(`/users/admin/${id}`),
    getAllCustomers: () => axiosClient.get('/users/admin/customers'),
};
