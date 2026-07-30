/**
 * Stock service.
 *
 * Anything that mutates inventory goes through here so we have one place to
 * keep the auto-decrement / low-stock / audit-log logic consistent.
 */
const supabase = require('../config/supabase');

/**
 * Decrease stock for each item in an order. Used when an order is marked
 * `completed` so inventory matches what was actually sold. Writes a
 * `stock_logs` row per adjustment so we can audit history.
 *
 * The order is expected to carry an `items` JSON array shaped like:
 *   [{ menu_item_id, variant_id?, quantity }]
 *
 * @param {object} supabaseClient - Supabase client (admin or scoped)
 * @param {string} vendorId - the vendor who owns the items
 * @param {Array<object>} items - order line items
 * @param {string} [reason='order_completed'] - audit reason
 * @returns {Promise<Array<{id:number, low_stock:boolean}>>} per-item low-stock flags
 */
async function decrementStockForOrder(supabaseClient, vendorId, items, reason = 'order_completed') {
    if (!Array.isArray(items) || items.length === 0) return [];

    const lowStockFlags = [];

    for (const line of items) {
        const quantity = Math.max(0, Number(line.quantity) || 0);
        if (!quantity) continue;

        // Variant stock takes priority — if the order picked a variant we
        // adjust the variant row and only touch the parent item if the
        // vendor tracks stock at the item level instead.
        if (line.variant_id) {
            const { data: variant } = await supabaseClient
                .from('item_variants')
                .select('id, quantity, menu_item_id')
                .eq('id', line.variant_id)
                .single();

            if (variant) {
                const next = variant.quantity == null ? null : Math.max(0, variant.quantity - quantity);
                await supabaseClient
                    .from('item_variants')
                    .update({ quantity: next })
                    .eq('id', variant.id);

                if (next != null) {
                    await supabaseClient.from('stock_logs').insert({
                        vendor_id: vendorId,
                        item_id: variant.menu_item_id,
                        variant_id: variant.id,
                        change: -quantity,
                        reason,
                    });
                }
            }
        } else if (line.menu_item_id) {
            const { data: item } = await supabaseClient
                .from('menu_items')
                .select('id, quantity, low_stock_threshold')
                .eq('id', line.menu_item_id)
                .single();

            if (item) {
                const next = item.quantity == null ? null : Math.max(0, item.quantity - quantity);
                await supabaseClient
                    .from('menu_items')
                    .update({ quantity: next })
                    .eq('id', item.id);

                if (next != null) {
                    await supabaseClient.from('stock_logs').insert({
                        vendor_id: vendorId,
                        item_id: item.id,
                        variant_id: null,
                        change: -quantity,
                        reason,
                    });

                    const threshold = item.low_stock_threshold ?? 5;
                    if (next <= threshold) lowStockFlags.push({ id: item.id, low_stock: true });
                }
            }
        }
    }

    return lowStockFlags;
}

/**
 * Add stock to an item (manual restock). Returns the new quantity.
 *
 * @param {object} supabaseClient
 * @param {string} vendorId
 * @param {number} itemId
 * @param {number} quantityToAdd
 * @returns {Promise<{id:number, quantity:number}|null>}
 */
async function addStock(supabaseClient, vendorId, itemId, quantityToAdd) {
    if (!quantityToAdd || quantityToAdd <= 0) return null;

    const { data: item } = await supabaseClient
        .from('menu_items')
        .select('id, quantity')
        .eq('id', itemId)
        .eq('vendor_id', vendorId)
        .single();

    if (!item) return null;

    const baseQty = item.quantity ?? 0;
    const next = baseQty + quantityToAdd;

    const { data, error } = await supabaseClient
        .from('menu_items')
        .update({ quantity: next })
        .eq('id', itemId)
        .select('id, quantity')
        .single();

    if (error) throw error;

    await supabaseClient.from('stock_logs').insert({
        vendor_id: vendorId,
        item_id: itemId,
        variant_id: null,
        change: quantityToAdd,
        reason: 'manual_restock',
    });

    return data;
}

/**
 * Return items for a vendor that are at or below their `low_stock_threshold`.
 *
 * @param {object} supabaseClient
 * @param {string} vendorId
 * @returns {Promise<Array<object>>}
 */
async function listLowStock(supabaseClient, vendorId) {
    const { data, error } = await supabaseClient
        .from('menu_items')
        .select('id, name, quantity, low_stock_threshold, available')
        .eq('vendor_id', vendorId)
        .not('quantity', 'is', null)
        .order('quantity', { ascending: true });

    if (error) throw error;
    return (data || []).filter((row) => {
        const threshold = row.low_stock_threshold ?? 5;
        return row.quantity <= threshold;
    });
}

module.exports = { decrementStockForOrder, addStock, listLowStock };
