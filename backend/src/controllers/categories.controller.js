/**
 * Custom vendor categories + keyword auto-categorisation rules.
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
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name required' });
    const { data, error } = await supabase
        .from('vendor_categories')
        .insert({ vendor_id: req.vendor.id, name })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
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
