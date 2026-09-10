/**
 * Authentication middleware.
 *
 * The Express API treats Supabase Auth as the source of truth. Every protected
 * route expects a `Authorization: Bearer <access_token>` header issued by
 * Supabase Auth on sign-in. We resolve the token to a Supabase user, then look
 * up the matching vendor record and attach it to the request.
 *
 * Usage:
 *   router.get('/me', verifyVendor, handler)
 */
const supabase = require('../config/supabase');

/**
 * Verify that the request is from an approved vendor. The middleware:
 *   1. Pulls a Bearer token from the Authorization header.
 *   2. Asks Supabase Auth who the token belongs to.
 *   3. Loads the matching `vendors` row.
 *   4. Rejects the request if the vendor is not in `open` / `approved` state.
 *
 * On success it sets `req.vendor` (the full row) and `req.user` (Supabase user).
 */
const verifyVendor = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', user.id)
        .single();

    if (vendorError || !vendor) {
        return res.status(403).json({ error: 'Not a registered vendor' });
    }

    // Verify account is approved/accepted
    if (vendor.verification_status !== 'accepted') {
        return res.status(403).json({
            error: `Account not active (${vendor.verification_status})`,
            verification_status: vendor.verification_status,
        });
    }

    req.vendor = vendor;
    req.user = user;
    next();
};

module.exports = { verifyVendor };
