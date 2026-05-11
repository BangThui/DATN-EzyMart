import axiosClient from './axiosClient';

export const supplierService = {
  getAll: () => axiosClient.get('/suppliers'),
  create: (data) => axiosClient.post('/suppliers', data),
  update: (id, data) => axiosClient.put(`/suppliers/${id}`, data),
  remove: (id) => axiosClient.delete(`/suppliers/${id}`),
};
