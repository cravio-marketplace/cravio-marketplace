/**
 * Cravio API entry point.
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

const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://cravio-marketplace-opal.vercel.app',
    'https://cravio-marketplace-git-main-cravio-marketplace.vercel.app',
    'https://cravio-marketplace-3i3xw7oan-cravio-marketplace.vercel.app',
];

const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);
const isCravioVercelOrigin = (origin) =>
    /^https:\/\/cravio-marketplace(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);
const isCustomerVercelOrigin = (origin) =>
    /^https:\/\/cravio-main-marketplace(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin) || isCravioVercelOrigin(origin) || isCustomerVercelOrigin(origin)) {
            return callback(null, true);
        }
        console.warn('[CORS] Blocked origin:', origin);
        return callback(new Error('Origin is not allowed by Cravio API CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Keep the trusted service-role client available to server-side handlers.
app.use((req, _res, next) => {
    req.supabase = supabase;
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customer/orders', customerOrdersRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/vendor/categories', categoriesRoutes);
app.use('/api/vendor/keywords', keywordsRoutes);
app.use('/api/vendor/featured', featuredRoutes);
app.use('/api/support', supportRoutes);

app.get('/', (_req, res) => res.json({ message: 'Cravio API running', version: '2.1' }));
app.get('/health', async (_req, res) => {
    const { error } = await supabase.from('vendors').select('id', { count: 'exact', head: true });
    res.status(error ? 503 : 200).json({
        status: error ? 'degraded' : 'healthy',
        supabase: error ? 'error' : 'connected',
    });
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` }));
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Cravio backend running on port ${PORT}`);
    console.log('[CORS] Allowed origins:', [...allowedOrigins].join(', '));
});
