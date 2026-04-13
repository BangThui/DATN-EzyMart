import axiosClient from './axiosClient';

export const orderService = {
    create: (data) => axiosClient.post('/orders', data),
    getByUserCode: (user_code) => axiosClient.get(`/orders/user/${user_code}`),
    getDetail: (mahang) => axiosClient.get(`/orders/detail/${mahang}`),
    // Admin
    getAll: () => axiosClient.get('/orders'),
    updateStatus: (id, tinhtrang) => axiosClient.put(`/orders/${id}/status`, { tinhtrang }),
};
