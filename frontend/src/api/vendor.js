import API from './client';

export const getMe = () => API.get('/vendor/me');
export const updateProfile = (payload) => API.put('/vendor/profile', payload);
export const updateStatus = (payload) => API.patch('/vendor/status', payload);
export const togglePause = () => API.patch('/vendor/toggle-pause');
export const toggleSms = () => API.patch('/vendor/toggle-sms');
export const fetchDashboard = () => API.get('/vendor/dashboard');
