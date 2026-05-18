import axiosClient from './axiosClient';

export const stockService = {
  getAll: () => axiosClient.get('/stock'),
  getById: (id) => axiosClient.get(`/stock/${id}`),
  importStock: (data) => axiosClient.post('/stock/import', data),
  bulkImportStock: (data) => axiosClient.post('/stock/bulk-import', data),
};
