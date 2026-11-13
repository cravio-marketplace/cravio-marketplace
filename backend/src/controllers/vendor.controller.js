/**
 * Vendor controller — profile, status, password.
 */
const supabase = require('../config/supabase');
const supabaseAuth = supabase.auth;
const { listLowStock } = require('../services/stock');

async function getMe(req, res) {
    const { data, error } = await supabase.from('vendors').select('*').eq('id', req.vendor.id).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, data });
}

async function updateProfile(req, res) {
    const allowed = ['business_name', 'phone', 'description', 'address', 'opening_hours', 'logo_url', 'cover_url'];
    const patch = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    const { data, error } = await supabase.from('vendors').update(patch).eq('id', req.vendor.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, data });
}

async function updateStatus(req, res) {
    const { status, closure_message } = req.body;
    const { data, error } = await supabase
        .from('vendors')
        .update({ status, closure_message })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, vendor: data });
}

async function togglePause(req, res) {
    const newStatus = !req.vendor.is_accepting_orders;
    const { data, error } = await supabase
        .from('vendors')
        .update({ is_accepting_orders: newStatus })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, is_accepting_orders: data.is_accepting_orders });
}

async function toggleSms(req, res) {
    const { data: vendor, error: readError } = await supabase
        .from('vendors').select('sms_enabled').eq('id', req.vendor.id).single();
    if (readError) return res.status(500).json({ error: readError.message });

    const { data, error } = await supabase
        .from('vendors')
        .update({ sms_enabled: !vendor.sms_enabled })
        .eq('id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, sms_enabled: data.sms_enabled });
}

async function changePassword(req, res) {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current and new password required' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const { error: signError } = await supabaseAuth.auth.signInWithPassword({
        email: req.user.email,
        password: current_password,
    });
    if (signError) return res.status(401).json({ error: 'Current password incorrect' });

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, { password: new_password });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: 'Password updated' });
}

async function dashboard(req, res) {
    const vendorId = req.vendor.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: orders, error: ordersErr }, lowStock] = await Promise.all([
        supabase.from('orders').select('id, total_price, status, created_at').eq('vendor_id', vendorId),
        listLowStock(supabase, vendorId).catch(() => []),
    ]);
    if (ordersErr) return res.status(500).json({ error: ordersErr.message });

    const todays = (orders || []).filter((order) => new Date(order.created_at) >= today);
    const todaysRevenue = todays
        .filter((order) => order.status === 'completed')
        .reduce((sum, order) => sum + (order.total_price || 0), 0);
    const activeStatuses = new Set(['pending', 'accepted', 'ready']);
    const active = (orders || []).filter((order) => activeStatuses.has(order.status));

    return res.json({
        success: true,
        stats: {
            todays_revenue: todaysRevenue,
            total_orders: (orders || []).length,
            todays_orders: todays.length,
            pending_actions: (orders || []).filter((order) => order.status === 'pending').length,
            active_orders: active.length,
        },
        low_stock: lowStock,
    });
}

module.exports = { getMe, updateProfile, updateStatus, togglePause, toggleSms, changePassword, dashboard };
