import axios from 'axios';

const axiosClient = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' }
});

// Request interceptor – thêm token vào header
axiosClient.interceptors.request.use(
    (config) => {
        const isAdminMode = window.location.pathname.startsWith('/admin');
        const tokenKey = isAdminMode ? 'admin_token' : 'token';
        const token = localStorage.getItem(tokenKey);
        
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor
axiosClient.interceptors.response.use(
    (response) => {
        if (response && response.data !== undefined) {
            return response.data;
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        console.error('API Error:', error.response?.data || error.message);
        throw error;
    }
);

export default axiosClient;
