import axiosClient from './axiosClient';

const triggerCartUpdate = () => {
    window.dispatchEvent(new Event("cart-updated"));
};

export const cartService = {
    getCart: (user_id) => axiosClient.get('/cart', { params: { user_id } }),
    addToCart: (data) => axiosClient.post('/cart', data).then(res => {
        triggerCartUpdate();
        return res;
    }),
    updateItem: (cart_id, quantity) => axiosClient.put(`/cart/${cart_id}`, { quantity }).then(res => {
        triggerCartUpdate();
        return res;
    }),
    removeItem: (cart_id) => axiosClient.delete(`/cart/${cart_id}`).then(res => {
        triggerCartUpdate();
        return res;
    }),
    clearCart: (user_id) => axiosClient.delete('/cart/clear', { data: { user_id } }).then(res => {
        triggerCartUpdate();
        return res;
    }),
};

