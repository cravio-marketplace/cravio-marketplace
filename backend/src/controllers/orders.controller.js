/**
 * Orders controller.
 *
 * Order lifecycle:
 *   pending → accepted → ready → completed
 *
 * `ready` mints a 4-digit pickup code that the student reads back to the
 * vendor. `complete` validates the code, flips status, and (via the stock
 * service) auto-decrements inventory.
 */
const supabase = require('../config/supabase');
const { decrementStockForOrder } = require('../services/stock');

/**
 * GET /api/orders
 * Optional query: ?status=pending&from=2026-07-01&to=2026-07-25
 */
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

/**
 * GET /api/orders/:orderId
 */
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
 */
async function accept(req, res) {
    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', req.params.orderId)
        .eq('vendor_id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, order: data });
}

/**
 * POST /api/orders/:orderId/ready
 * Mints a 4-digit pickup code.
 */
async function ready(req, res) {
    const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();
    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'ready', pickup_code: pickupCode })
        .eq('id', req.params.orderId)
        .eq('vendor_id', req.vendor.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, code: pickupCode, order: data });
}

/**
 * POST /api/orders/:orderId/complete
 * Body: { code }
 *
 * Validates the pickup code, marks the order completed, and decrements
 * stock. Returns `low_stock` so the client can show a toast.
 */
async function complete(req, res) {
    const { code } = req.body;
    const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', req.params.orderId)
        .eq('vendor_id', req.vendor.id)
        .single();
    if (fetchErr || !order) return res.status(404).json({ error: 'Order not found' });
    if (!code || order.pickup_code !== code) {
        return res.status(400).json({ error: 'Invalid pickup code' });
    }

    const { data, error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    const lowStockFlags = await decrementStockForOrder(supabase, req.vendor.id, order.items, 'order_completed');

    res.json({
        success: true,
        order: data,
        low_stock: lowStockFlags.length > 0,
        low_stock_items: lowStockFlags,
    });
}

/**
 * GET /api/orders/export.csv
 * Streams the vendor's orders as a CSV download.
 */
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
