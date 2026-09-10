/**
 * Menu controller.
 *
 * Menu items can have variants (Small/Large/etc) and an optional stock
 * quantity. When stock is tracked we expose a manual restock endpoint that
 * records the adjustment in `stock_logs`.
 */
const supabase = require('../config/supabase');
const { suggestCategory } = require('../services/categories');
const { addStock } = require('../services/stock');

/**
 * GET /api/menu
 */
async function list(req, res) {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*, item_variants(*)')
        .eq('vendor_id', req.vendor.id)
        .order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, menu: data });
}

/**
 * GET /api/menu/:itemId
 */
async function getOne(req, res) {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*, item_variants(*)')
        .eq('id', req.params.itemId)
        .eq('vendor_id', req.vendor.id)
        .single();
    if (error) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true, item: data });
}

/**
 * POST /api/menu
 * Body: { name, price, category?, available?, quantity?, low_stock_threshold?, meal_time?, image_url?, variations? }
 */
async function create(req, res) {
    const {
        name,
        price,
        category,
        available,
        quantity,
        low_stock_threshold,
        meal_time,
        image_url,
        variations,
    } = req.body;

    if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
    if (price < 0) return res.status(400).json({ error: 'Price cannot be negative' });
    if (quantity !== undefined && quantity < 0) return res.status(400).json({ error: 'Quantity cannot be negative' });
    if (low_stock_threshold !== undefined && low_stock_threshold < 0) return res.status(400).json({ error: 'Threshold cannot be negative' });

    const suggested = await suggestCategory(req.vendor.id, name);
    const finalCategory = category || suggested;

    const { data: menuItem, error } = await supabase
        .from('menu_items')
        .insert({
            vendor_id: req.vendor.id,
            name,
            price,
            category: finalCategory,
            available: available !== undefined ? available : true,
            quantity: quantity ?? null,
            low_stock_threshold: low_stock_threshold ?? 5,
            meal_time: meal_time || [],
            image_url: image_url || null,
        })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    if (Array.isArray(variations) && variations.length) {
        const variantInserts = variations.map((v) => ({
            menu_item_id: menuItem.id,
            name: v.name,
            price: v.price,
            quantity: v.quantity ?? null,
            available: v.available !== false,
        }));
        await supabase.from('item_variants').insert(variantInserts);
    }

    res.json({ success: true, item: menuItem });
}

/**
 * PUT /api/menu/:itemId
 */
async function update(req, res) {
    const { itemId } = req.params;
    const {
        name,
        price,
        category,
        available,
        quantity,
        low_stock_threshold,
        meal_time,
        image_url,
        variations,
    } = req.body;

    const patch = {};
    for (const [key, value] of Object.entries({
        name,
        price,
        category,
        available,
        quantity,
        low_stock_threshold,
        meal_time,
        image_url,
    })) {
        if (value === undefined) continue;
        if (key === 'price' && value < 0) return res.status(400).json({ error: 'Price cannot be negative' });
        if (key === 'quantity' && value < 0) return res.status(400).json({ error: 'Quantity cannot be negative' });
        if (key === 'low_stock_threshold' && value < 0) return res.status(400).json({ error: 'Threshold cannot be negative' });
        patch[key] = value;
    }

    const { data, error } = await supabase
        .from('menu_items')
        .update(patch)
        .eq('id', itemId)
        .eq('vendor_id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    if (Array.isArray(variations)) {
        await supabase.from('item_variants').delete().eq('menu_item_id', itemId);
        if (variations.length) {
            const variantInserts = variations.map((v) => ({
                menu_item_id: parseInt(itemId, 10),
                name: v.name,
                price: v.price,
                quantity: v.quantity ?? null,
                available: v.available !== false,
            }));
            await supabase.from('item_variants').insert(variantInserts);
        }
    }

    res.json({ success: true, item: data });
}

/**
 * DELETE /api/menu/:itemId
 */
async function remove(req, res) {
    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', req.params.itemId)
        .eq('vendor_id', req.vendor.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
}

/**
 * PATCH /api/menu/:itemId/availability
 * Body: { available: boolean }
 */
async function toggleAvailability(req, res) {
    const { available } = req.body;
    if (typeof available !== 'boolean') {
        return res.status(400).json({ error: 'available must be boolean' });
    }
    const { data, error } = await supabase
        .from('menu_items')
        .update({ available })
        .eq('id', req.params.itemId)
        .eq('vendor_id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, item: data });
}

/**
 * POST /api/menu/:itemId/restock
 * Body: { quantity: number }
 */
async function restock(req, res) {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'quantity must be positive' });
    }
    const updated = await addStock(supabase, req.vendor.id, parseInt(req.params.itemId, 10), Number(quantity));
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true, item: updated });
}

/**
 * GET /api/menu/:itemId/stock-history
 */
async function stockHistory(req, res) {
    const { data, error } = await supabase
        .from('stock_logs')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .eq('item_id', req.params.itemId)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, history: data });
}

module.exports = {
    list,
    getOne,
    create,
    update,
    remove,
    toggleAvailability,
    restock,
    stockHistory,
};
