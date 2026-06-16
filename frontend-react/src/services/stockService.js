import axiosClient from './axiosClient';

export const stockService = {
  getAll: (params) => axiosClient.get('/stock', { params }),
  getById: (id) => axiosClient.get(`/stock/${id}`),
  importStock: (data) => axiosClient.post('/stock/import', data),
  bulkImportStock: (data) => axiosClient.post('/stock/bulk-import', data),
  exportPDF: (id) => axiosClient.get(`/stock/export-pdf/${id}`, { responseType: 'blob' }),
  exportReportPDF: (params) => axiosClient.get('/stock/export-report-pdf', { params, responseType: 'blob' }),
};
