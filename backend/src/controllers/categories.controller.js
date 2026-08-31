/**
 * Vendor categories + keyword auto-categorisation rules.
 *
 * Categories are per-vendor and unique on (vendor_id, name). The create
 * path is defensive: it trims the input, normalises case for the dedupe
 * check, and surfaces a 409 with a friendly message when the name is
 * already taken instead of leaking the raw Postgres unique-violation
 * error to the UI.
 */
const supabase = require('../config/supabase');

async function list(req, res) {
    const { data, error } = await supabase
        .from('vendor_categories')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .order('name');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, categories: data });
}

async function create(req, res) {
    const raw = typeof req.body?.name === 'string' ? req.body.name : '';
    const name = raw.trim();
    if (!name) return res.status(400).json({ error: 'Category name required' });

    // Case-insensitive dedupe. UNIQUE(vendor_id, name) protects against a
    // race, but pre-checking gives the user a clean 409 with a friendly
    // message instead of a raw Postgres error.
    const { data: existing } = await supabase
        .from('vendor_categories')
        .select('id')
        .eq('vendor_id', req.vendor.id)
        .ilike('name', name)
        .maybeSingle();
    if (existing) {
        return res.status(409).json({
            error: `You already have a category called "${name}".`,
            code: 'duplicate_category',
        });
    }

    const { data, error } = await supabase
        .from('vendor_categories')
        .insert({ vendor_id: req.vendor.id, name })
        .select()
        .single();

    if (error) {
        // Race-condition fallback: a parallel insert won. Same UX.
        if (/duplicate key|already exists/i.test(error.message || '')) {
            return res.status(409).json({
                error: `You already have a category called "${name}".`,
                code: 'duplicate_category',
            });
        }
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, category: data });
}

async function remove(req, res) {
    const { error } = await supabase
        .from('vendor_categories')
        .delete()
        .eq('id', req.params.id)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
}

module.exports = { list, create, remove };
