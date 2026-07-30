/**
 * Featured items / promotions controller.
 *
 * Vendors submit requests to feature a menu item for N days. The MVP stores
 * them in `featured_items`; admin approval + payment comes later.
 */
const supabase = require('../config/supabase');

/**
 * GET /api/featured
 * Lists the vendor's own featured-item requests.
 */
async function list(req, res) {
    const { data, error } = await supabase
        .from('featured_items')
        .select('*, menu_items(name, image_url, price)')
        .eq('vendor_id', req.vendor.id)
        .order('priority', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, featured: data });
}

/**
 * POST /api/featured
 * Body: { menu_item_id, priority, expires_at? }
 *
 * `priority` is 1-10. `expires_at` defaults to 7 days from now if not given.
 */
async function create(req, res) {
    const { menu_item_id, priority, expires_at } = req.body;
    if (!menu_item_id) return res.status(400).json({ error: 'Menu item required' });
    if (priority && (priority < 1 || priority > 10)) {
        return res.status(400).json({ error: 'priority must be between 1 and 10' });
    }

    const expires = expires_at
        ? new Date(expires_at).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('featured_items')
        .insert({
            menu_item_id,
            vendor_id: req.vendor.id,
            priority: priority || 5,
            expires_at: expires,
            status: 'pending',
        })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, featured: data });
}

async function remove(req, res) {
    const { error } = await supabase
        .from('featured_items')
        .delete()
        .eq('id', req.params.id)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
}

module.exports = { list, create, remove };
