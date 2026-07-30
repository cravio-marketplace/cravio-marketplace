import API from './client';

export const fetchMenu = () => API.get('/menu');
export const createItem = (payload) => API.post('/menu', payload);
export const updateItem = (id, payload) => API.put(`/menu/${id}`, payload);
export const deleteItem = (id) => API.delete(`/menu/${id}`);
export const toggleAvailability = (id, available) =>
    API.patch(`/menu/${id}/availability`, { available });
export const restock = (id, quantity) => API.post(`/menu/${id}/restock`, { quantity });
export const fetchStockHistory = (id) => API.get(`/menu/${id}/stock-history`);

export const fetchCategories = () => API.get('/vendor/categories');
export const createCategory = (name) => API.post('/vendor/categories', { name });
export const deleteCategory = (id) => API.delete(`/vendor/categories/${id}`);

export const fetchKeywords = () => API.get('/vendor/keywords');
export const createKeyword = (payload) => API.post('/vendor/keywords', payload);
export const deleteKeyword = (id) => API.delete(`/vendor/keywords/${id}`);

export const fetchFeatured = () => API.get('/vendor/featured');
export const createFeatured = (payload) => API.post('/vendor/featured', payload);
export const deleteFeatured = (id) => API.delete(`/vendor/featured/${id}`);
