/**
 * Vendor controller — profile, status, password.
 */
const supabase = require('../config/supabase');
const { listLowStock } = require('../services/stock');

/**
 * GET /api/vendor/me
 * Returns the authenticated vendor's full record.
 */
async function getMe(req, res) {
    const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', req.vendor.id)
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
}

/**
 * PUT /api/vendor/profile
 * Body: any subset of { business_name, phone, description, address, opening_hours, logo_url, cover_url }
 */
async function updateProfile(req, res) {
    const allowed = [
        'business_name',
        'phone',
        'description',
        'address',
        'opening_hours',
        'logo_url',
        'cover_url',
    ];
    const patch = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) patch[key] = req.body[key];
    }

    const { data, error } = await supabase
        .from('vendors')
        .update(patch)
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
}

/**
 * PATCH /api/vendor/status
 * Body: { status, closure_message? }
 */
async function updateStatus(req, res) {
    const { status, closure_message } = req.body;
    const { data, error } = await supabase
        .from('vendors')
        .update({ status, closure_message })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, vendor: data });
}

/**
 * PATCH /api/vendor/toggle-pause
 * Flips `is_accepting_orders`.
 */
async function togglePause(req, res) {
    const newStatus = !req.vendor.is_accepting_orders;
    const { data, error } = await supabase
        .from('vendors')
        .update({ is_accepting_orders: newStatus })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, is_accepting_orders: data.is_accepting_orders });
}

/**
 * PATCH /api/vendor/toggle-sms
 * Flips `sms_enabled` (feature flag, not wired to a provider yet).
 */
async function toggleSms(req, res) {
    const { data: vendor } = await supabase
        .from('vendors')
        .select('sms_enabled')
        .eq('id', req.vendor.id)
        .single();

    const newStatus = !vendor.sms_enabled;
    const { data, error } = await supabase
        .from('vendors')
        .update({ sms_enabled: newStatus })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, sms_enabled: data.sms_enabled });
}

/**
 * POST /api/vendor/change-password
 * Body: { current_password, new_password }
 */
async function changePassword(req, res) {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new password required' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const { error: signError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: current_password,
    });
    if (signError) return res.status(401).json({ error: 'Current password incorrect' });

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password: new_password });
    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, message: 'Password updated' });
}

/**
 * GET /api/vendor/dashboard
 * Aggregated stats for the dashboard hero: today's revenue, total orders,
 * pending actions, active orders, and a low-stock banner payload.
 */
async function dashboard(req, res) {
    const vendorId = req.vendor.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: orders, error: ordersErr }, lowStock] = await Promise.all([
        supabase
            .from('orders')
            .select('id, total_price, status, created_at')
            .eq('vendor_id', vendorId),
        listLowStock(supabase, vendorId).catch(() => []),
    ]);

    if (ordersErr) return res.status(500).json({ error: ordersErr.message });

    const todays = (orders || []).filter((o) => new Date(o.created_at) >= today);
    const todaysRevenue = todays
        .filter((o) => o.status === 'completed')
        .reduce((sum, o) => sum + (o.total_price || 0), 0);

    const activeStatuses = new Set(['pending', 'accepted', 'ready']);
    const active = (orders || []).filter((o) => activeStatuses.has(o.status));

    res.json({
        success: true,
        stats: {
            todays_revenue: todaysRevenue,
            total_orders: (orders || []).length,
            todays_orders: todays.length,
            pending_actions: (orders || []).filter((o) => o.status === 'pending').length,
            active_orders: active.length,
        },
        low_stock: lowStock,
    });
}

module.exports = {
    getMe,
    updateProfile,
    updateStatus,
    togglePause,
    toggleSms,
    changePassword,
    dashboard,
};
