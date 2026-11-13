/**
 * Shared Axios client for all vendor API requests.
 *
 * VITE_API_URL can override the API origin per environment. Without an
 * override, Vite development uses the local Express API and production uses
 * the deployed Render API.
 */
import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const baseURL =
    configuredApiUrl ||
    (import.meta.env.DEV
        ? 'http://localhost:5000/api'
        : 'https://cravio-marketplace-jwlq.onrender.com/api');

const API = axios.create({
    baseURL,
    timeout: 30000,
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const NETWORK_ERROR_MESSAGE =
    'Cannot reach the server. Check your connection and try again.';

export const mapError = (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const msg = data?.error || error?.message;

    if (error.isNetworkError) return NETWORK_ERROR_MESSAGE;

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return 'The server took too long to respond. Please check your connection and try again.';
    }

    if (status === 409) {
        if (msg?.toLowerCase().includes('category')) {
            return 'A category with this name already exists. Please try another.';
        }
        return 'This item already exists.';
    }

    if (status === 403) {
        return data?.verification_status === 'pending'
            ? 'Your account is pending admin approval.'
            : 'You do not have permission to perform this action.';
    }

    if (status === 401) return 'Your session has expired. Please sign in again.';

    return msg || 'An unexpected error occurred. Please try again.';
};

API.interceptors.response.use(
    (response) => response,
    (error) => {
        const code = error?.code;
        const isNetwork =
            code === 'ERR_NETWORK' ||
            /fetch failed/i.test(error?.message || '') ||
            /Network Error/i.test(error?.message || '');

        if (isNetwork) {
            error.friendlyMessage = NETWORK_ERROR_MESSAGE;
            error.isNetworkError = true;
        }

        return Promise.reject(error);
    }
);

export { NETWORK_ERROR_MESSAGE };
export default API;
