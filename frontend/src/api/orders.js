import API from './client';

export const fetchOrders = (params) => API.get('/orders', { params });
export const getOrder = (id) => API.get(`/orders/${id}`);
export const acceptOrder = (id) => API.post(`/orders/${id}/accept`);
export const markOrderReady = (id) => API.post(`/orders/${id}/ready`);
export const completeOrder = (id, code) => API.post(`/orders/${id}/complete`, { code });
export const exportOrdersCsvUrl = () =>
    `${API.defaults.baseURL}/orders/export.csv?token=${localStorage.getItem('token') || ''}`;
