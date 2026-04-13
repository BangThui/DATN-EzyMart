import axiosClient from './axiosClient';

export const cartService = {
    getCart: (user_id) => axiosClient.get('/cart', { params: { user_id } }),
    addToCart: (data) => axiosClient.post('/cart', data),
    updateItem: (cart_id, quantity) => axiosClient.put(`/cart/${cart_id}`, { quantity }),
    removeItem: (cart_id) => axiosClient.delete(`/cart/${cart_id}`),
    clearCart: (user_id) => axiosClient.delete('/cart/clear', { data: { user_id } }),
};
