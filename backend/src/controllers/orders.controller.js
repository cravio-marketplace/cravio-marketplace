/**
 * Orders controller.
 *
 * Order lifecycle:
 *   pending → accepted → ready → completed
 *
 * Completion is guarded by a conditional database update so concurrent/retried
 * pickup requests cannot decrement stock more than once.
 */
const { randomInt } = require('node:crypto');
const supabase = require('../config/supabase');
const { decrementStockForOrder } = require('../services/stock');

async function list(req, res) {
    let query = supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .order('created_at', { ascending: false });

    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.from) query = query.gte('created_at', req.query.from);
    if (req.query.to) query = query.lte('created_at', req.query.to);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, orders: data });
}

async function getOne(req, res) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', req.params.orderId)
        .eq('vendor_id', req.vendor.id)
        .single();
    if (error) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order: data });
}

/**
 * POST /api/orders/:orderId/accept
 * Only pending orders may be accepted.
 */
async function accept(req, res) {
    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', req.params.orderId)
        .eq('vendor_id', req.vendor.id)
        .eq('status', 'pending')
        .select()
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(409).json({ error: 'Only pending orders can be accepted.' });
    res.json({ success: true, order: data });
}

/**
 * POST /api/orders/:orderId/ready
 * Only accepted orders may be marked ready.
 */
async function ready(req, res) {
    const pickupCode = String(randomInt(1000, 10000));
    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'ready', pickup_code: pickupCode })
        .eq('id', req.params.orderId)
        .eq('vendor_id', req.vendor.id)
        .eq('status', 'accepted')
        .select()
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(409).json({ error: 'Only accepted orders can be marked ready.' });
    res.json({ success: true, code: pickupCode, order: data });
}

/**
 * POST /api/orders/:orderId/complete
 * Body: { code }
 *
 * The status + pickup-code predicate makes completion a single-winner
 * operation. Stock is decremented only after that conditional update succeeds.
 */
async function complete(req, res) {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!/^\d{4}$/.test(code)) {
        return res.status(400).json({ error: 'Enter the 4-digit pickup code.' });
    }

    const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('id,items,status,pickup_code')
        .eq('id', req.params.orderId)
        .eq('vendor_id', req.vendor.id)
        .maybeSingle();

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'ready') {
        return res.status(409).json({ error: 'Only ready orders can be completed.' });
    }
    if (order.pickup_code !== code) {
        return res.status(400).json({ error: 'Invalid pickup code' });
    }

    // Atomic compare-and-set: only one request can move ready → completed.
    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id)
        .eq('vendor_id', req.vendor.id)
        .eq('status', 'ready')
        .eq('pickup_code', code)
        .select()
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(409).json({ error: 'This order has already been completed or changed.' });

    try {
        const lowStockFlags = await decrementStockForOrder(supabase, req.vendor.id, order.items, 'order_completed');
        return res.json({
            success: true,
            order: data,
            low_stock: lowStockFlags.length > 0,
            low_stock_items: lowStockFlags,
        });
    } catch (stockError) {
        // The order is completed already; expose a clear operational error
        // instead of allowing a retry to decrement inventory a second time.
        console.error('Stock decrement failed after order completion:', stockError);
        return res.status(500).json({
            error: 'Order completed, but inventory could not be updated. Contact support before retrying.',
            order_completed: true,
        });
    }
}

async function exportCsv(req, res) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const headers = [
        'id',
        'student_name',
        'total_price',
        'status',
        'payment_method',
        'pickup_code',
        'created_at',
    ];

    const escape = (val) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = (data || []).map((o) => headers.map((h) => escape(o[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${Date.now()}.csv"`);
    res.send(csv);
}

module.exports = { list, getOne, accept, ready, complete, exportCsv };
