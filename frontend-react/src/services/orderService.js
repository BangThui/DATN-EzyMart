import axiosClient from './axiosClient';

export const orderService = {
    create: (data) => axiosClient.post('/orders', data),
    getByUserCode: (user_code) => axiosClient.get(`/orders/user/${user_code}`),
    getDetail: (mahang) => axiosClient.get(`/orders/detail/${mahang}`),
    // Admin
    getAll: (params = {}) => axiosClient.get('/orders', { params }),
    updateStatus: (id, tinhtrang) => axiosClient.put(`/orders/${id}/status`, { tinhtrang }),
    // Click & Collect: cập nhật pickup_status
    updatePickupStatus: (id, pickup_status) => axiosClient.patch(`/orders/${id}/pickup-status`, { pickup_status }),

    // Customer
    customerUpdateStatus: (id) => axiosClient.patch(`/orders/${id}/status`),
    customerCancelOrder: (id) => axiosClient.patch(`/orders/${id}/cancel`),
};
