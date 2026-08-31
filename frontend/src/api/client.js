/**
 * Single Axios instance + auth interceptor.
 *
 * All API modules import from here so the base URL and Bearer-token
 * injection live in exactly one place.
 *
 * Response interceptor turns "fetch failed" / "Network Error" into a single
 * human-readable message so the UI doesn't leak raw axios internals to the
 * vendor.
 */
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
    // eslint-disable-next-line no-console
    console.error(
        '[api] VITE_API_URL is not set. Add it to frontend/.env and restart the dev server. ' +
            'Without it, requests fall back to localhost:5000 and will "fetch failed" in production.'
    );
}

const API = axios.create({
    baseURL: baseURL || 'http://localhost:5000/api',
    timeout: 30000,
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const NETWORK_ERROR_MESSAGE =
    'Cannot reach the server. Check your connection and try again.';

API.interceptors.response.use(
    (response) => response,
    (error) => {
        // axios wraps network failures with code === 'ERR_NETWORK' on browsers
        // and "fetch failed" on Node. Translate both into one message.
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