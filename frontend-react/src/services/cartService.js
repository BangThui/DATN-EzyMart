import axiosClient from './axiosClient';

const triggerCartUpdate = () => {
    window.dispatchEvent(new Event("cart-updated"));
};

const getGuestCart = () => JSON.parse(localStorage.getItem('guest_cart')) || [];
const saveGuestCart = (cart) => localStorage.setItem('guest_cart', JSON.stringify(cart));

export const cartService = {
    getCart: (user_id) => {
        if (user_id) {
            return axiosClient.get('/cart', { params: { user_id } });
        } else {
            const guestCart = getGuestCart();
            if (guestCart.length === 0) return Promise.resolve([]);
            return axiosClient.post('/cart/guest', { items: guestCart });
        }
    },
    
    addToCart: (data) => {
        if (data.user_id) {
            return axiosClient.post('/cart', data).then(res => {
                triggerCartUpdate();
                return res;
            });
        } else {
            const guestCart = getGuestCart();
            const existing = guestCart.find(item => item.product_id === data.product_id && item.variant_id === data.variant_id);
            if (existing) {
                existing.quantity += data.quantity;
            } else {
                guestCart.push({
                    product_id: data.product_id,
                    variant_id: data.variant_id,
                    quantity: data.quantity
                });
            }
            saveGuestCart(guestCart);
            triggerCartUpdate();
            return Promise.resolve({ message: 'Đã thêm vào giỏ hàng khách' });
        }
    },

    updateItem: (cart_id, quantity) => {
        if (typeof cart_id === 'string' && cart_id.includes('_')) {
            const [product_id, variant_id] = cart_id.split('_').map(Number);
            const guestCart = getGuestCart();
            const existing = guestCart.find(item => item.product_id === product_id && item.variant_id === variant_id);
            if (existing) {
                if (quantity <= 0) {
                    const newCart = guestCart.filter(item => item.product_id !== product_id || item.variant_id !== variant_id);
                    saveGuestCart(newCart);
                } else {
                    existing.quantity = quantity;
                    saveGuestCart(guestCart);
                }
            }
            triggerCartUpdate();
            return Promise.resolve({ message: 'Cập nhật giỏ hàng khách' });
        } else {
            return axiosClient.put(`/cart/${cart_id}`, { quantity }).then(res => {
                triggerCartUpdate();
                return res;
            });
        }
    },

    removeItem: (cart_id) => {
        if (typeof cart_id === 'string' && cart_id.includes('_')) {
            const [product_id, variant_id] = cart_id.split('_').map(Number);
            const guestCart = getGuestCart();
            const newCart = guestCart.filter(item => item.product_id !== product_id || item.variant_id !== variant_id);
            saveGuestCart(newCart);
            triggerCartUpdate();
            return Promise.resolve({ message: 'Xoá khỏi giỏ hàng khách' });
        } else {
            return axiosClient.delete(`/cart/${cart_id}`).then(res => {
                triggerCartUpdate();
                return res;
            });
        }
    },

    clearCart: (user_id) => {
        if (user_id) {
            return axiosClient.delete('/cart/clear', { data: { user_id } }).then(res => {
                triggerCartUpdate();
                return res;
            });
        } else {
            localStorage.removeItem('guest_cart');
            triggerCartUpdate();
            return Promise.resolve({ message: 'Đã xoá giỏ hàng khách' });
        }
    },

    mergeCart: (user_id) => {
        const guestCart = getGuestCart();
        if (guestCart.length === 0) return Promise.resolve();
        return axiosClient.post('/cart/merge', { user_id, items: guestCart }).then(res => {
            localStorage.removeItem('guest_cart');
            triggerCartUpdate();
            return res;
        });
    }
};
