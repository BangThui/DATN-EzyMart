import axiosClient from './axiosClient';

export const authService = {
    login: (data) => axiosClient.post('/auth/login', data),
    register: (data) => axiosClient.post('/auth/register', data),
    getMe: () => axiosClient.get('/auth/me'),
};
