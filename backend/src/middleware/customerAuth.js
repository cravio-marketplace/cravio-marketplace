/**
 * Authenticate a customer request with a Supabase access token.
 * Vendor routes continue using verifyVendor and are not changed.
 */
const supabase = require('../config/supabase');

async function verifyCustomer(req, res, next) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.slice(7).trim();
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || !data?.user) {
            return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
        }
        req.customer = data.user;
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = { verifyCustomer };
