import axiosClient from './axiosClient';

export const authService = {
    login: (data) => axiosClient.post('/auth/login', data),
    register: (data) => axiosClient.post('/auth/register', data),
    getMe: () => axiosClient.get('/auth/me'),
    googleLogin: (credential) => axiosClient.post('/auth/google-login', { credential }),
    forgotPassword: (data) => axiosClient.post('/auth/forgot-password', data),
    verifyOtp: (data) => axiosClient.post('/auth/verify-otp', data),
    verifyOtpReset: (data) => axiosClient.post('/auth/verify-otp-reset', data),
};

