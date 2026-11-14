/** Admin-only middleware. Admin privilege must be set in trusted Supabase app_metadata. */
const supabase = require('../config/supabase');

async function verifyAdmin(req, res, next) {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    try {
        const { data, error } = await supabase.auth.getUser(header.slice(7).trim());
        if (error || !data?.user) return res.status(401).json({ error: 'Invalid session' });
        const metadata = data.user.app_metadata || {};
        const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
        if (metadata.role !== 'admin' && !roles.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = data.user;
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = { verifyAdmin };
