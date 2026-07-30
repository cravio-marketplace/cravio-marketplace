/**
 * Keyword mapping controller.
 *
 * Lets a vendor define rules like "rice → Swallows" so that when they
 * create a new menu item, the auto-categoriser can fill in the category.
 */
const supabase = require('../config/supabase');

async function list(req, res) {
    const { data, error } = await supabase
        .from('keyword_mappings')
        .select('*, vendor_categories(name)')
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, keywords: data });
}

async function create(req, res) {
    const { keyword, category_id } = req.body;
    if (!keyword || !category_id) {
        return res.status(400).json({ error: 'Keyword and category required' });
    }
    const { data, error } = await supabase
        .from('keyword_mappings')
        .insert({ vendor_id: req.vendor.id, keyword, category_id })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, keyword: data });
}

async function remove(req, res) {
    const { error } = await supabase
        .from('keyword_mappings')
        .delete()
        .eq('id', req.params.id)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
}

module.exports = { list, create, remove };
