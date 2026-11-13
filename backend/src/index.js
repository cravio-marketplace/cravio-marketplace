/**
 * Cravio API entry point.
 *
 * Bootstraps Express, wires up the route modules, and exposes a couple of
 * health checks. Anything that talks to Supabase lives in controllers /
 * services; this file just glues them together.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabase');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendor');
const ordersRoutes = require('./routes/orders');
const customerOrdersRoutes = require('./routes/customer-orders');
const menuRoutes = require('./routes/menu');
const categoriesRoutes = require('./routes/categories');
const keywordsRoutes = require('./routes/keywords');
const featuredRoutes = require('./routes/featured');
const supportRoutes = require('./routes/support');

const app = express();
const PORT = process.env.PORT || 5000;

// Keep local Vite/React development origins available even when FRONTEND_URL
// is configured for the deployed Vercel app. Add production/preview origins
// explicitly through FRONTEND_URL as a comma-separated list.
const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://cravio-marketplace-opal.vercel.app',
];

const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.has(origin)) {
                return cb(null, true);
            }
            return cb(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: '1mb' }));

// Make the Supabase client available on every request for convenience.
app.use((req, _res, next) => {
    req.supabase = supabase;
    next();
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customer/orders', customerOrdersRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/vendor/categories', categoriesRoutes);
app.use('/api/vendor/keywords', keywordsRoutes);
app.use('/api/vendor/featured', featuredRoutes);
app.use('/api/support', supportRoutes);

// --- Health & root ---
app.get('/', (_req, res) => res.json({ message: 'Cravio API running', version: '2.0' }));
app.get('/health', async (_req, res) => {
    const { error } = await supabase.from('vendors').select('id', { count: 'exact', head: true });
    res.json({ status: 'healthy', supabase: error ? 'error' : 'connected' });
});

// 404 + error handler last.
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` }));
app.use(errorHandler);

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Cravio backend running on port ${PORT}`);
    console.log('[CORS] Allowed origins:', [...allowedOrigins].join(', '));
});
