/**
 * Customer order endpoints. Checkout uses a single PostgreSQL RPC so stock
 * reservation and order insertion commit or roll back together.
 */
const supabase = require('../config/supabase');
const { FEES, calculateServiceFee } = require('../config/fees');

const MAX_LINES = 30;
const MAX_QUANTITY_PER_LINE = 20;

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function feePreview(req, res, next) {
    try {
        const subtotalKobo = Number(req.query.subtotal_kobo);
        if (!Number.isSafeInteger(subtotalKobo) || subtotalKobo <= 0) return res.status(400).json({ error: 'A valid subtotal in kobo is required.' });
        const { count, error } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', req.customer.id);
        if (error) throw error;
        const isFirstOrder = (count || 0) === 0;
        return res.json({ success: true, is_first_order: isFirstOrder, service_fee: calculateServiceFee(subtotalKobo, isFirstOrder), currency_unit: 'kobo' });
    } catch (error) { return next(error); }
}
async function create(req, res, next) {
    try {
        const customer = req.customer;
        const {
            vendor_id: vendorId, items, student_name: studentName,
            student_phone: studentPhone, pickup_point: pickupPoint,
            pickup_instructions: pickupInstructions, payment_method: paymentMethod,
            client_order_id: clientOrderId,
        } = req.body || {};

        // Vendor IDs are Supabase Auth UUIDs (vendors.id references auth.users.id).
        // Do not coerce them to numbers: that rejects every legitimate vendor UUID.
        if (typeof vendorId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor is required.' });
        }
        if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
            return res.status(400).json({ error: 'Your cart must contain between 1 and 30 items.' });
        }
        if (cleanText(studentName, 80).length < 2) return res.status(400).json({ error: 'Enter your full name.' });
        if (!/^\+?[0-9\s()-]{10,18}$/.test(cleanText(studentPhone, 24))) return res.status(400).json({ error: 'Enter a valid phone number.' });
        if (cleanText(pickupPoint, 160).length < 3) return res.status(400).json({ error: 'Enter your campus pickup point.' });
        if (paymentMethod !== 'cash') return res.status(400).json({ error: 'Only Cash on Pickup is currently available.' });
        if (!/^[0-9a-f-]{36}$/i.test(String(clientOrderId || ''))) return res.status(400).json({ error: 'A valid checkout request ID is required.' });

        const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .select('id,verification_status,is_accepting_orders,status')
            .eq('id', vendorId)
            .maybeSingle();
        if (vendorError) throw vendorError;
        if (!vendor || vendor.verification_status !== 'accepted' || vendor.is_accepting_orders !== true || vendor.status === 'closed') {
            return res.status(409).json({ error: 'This vendor is not accepting orders right now.' });
        }

        // Aggregate repeated lines before passing them to the transactional RPC.
        const quantities = new Map();
        for (const line of items) {
            const itemId = Number(line?.menu_item_id);
            const quantity = Number(line?.quantity);
            if (!Number.isSafeInteger(itemId) || itemId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY_PER_LINE) {
                return res.status(400).json({ error: 'One or more cart items are invalid.' });
            }
            const combined = (quantities.get(itemId) || 0) + quantity;
            if (combined > MAX_QUANTITY_PER_LINE) return res.status(400).json({ error: 'The quantity for an item cannot exceed 20.' });
            quantities.set(itemId, combined);
        }

        const { data, error } = await supabase.rpc('create_customer_order_with_stock', {
            p_vendor_id: vendorId,
            p_customer_id: customer.id,
            p_client_order_id: clientOrderId,
            p_student_name: cleanText(studentName, 80),
            p_student_phone: cleanText(studentPhone, 24),
            p_pickup_point: cleanText(pickupPoint, 160),
            p_pickup_instructions: cleanText(pickupInstructions, 500),
            p_items: [...quantities.entries()].map(([menu_item_id, quantity]) => ({ menu_item_id, quantity })),
            p_service_fee_rate_bps: FEES.customerServiceFee.rateBps,
            p_service_fee_min_kobo: FEES.customerServiceFee.minKobo,
            p_service_fee_max_kobo: FEES.customerServiceFee.maxKobo,
            p_first_order_fee_waived: FEES.customerServiceFee.firstOrderFree,
            p_commission_rate_bps: FEES.vendorCommission.rateBps,
            p_commission_free_days: FEES.vendorCommission.freeDays,
            p_cash_owed_cap_kobo: FEES.cashSettlement.outstandingCapKobo,
            p_settlement_due_days: FEES.cashSettlement.dueDays,
        });

        if (error) {
            console.error('Atomic customer checkout failed:', error);
            const message = error.message || 'Unable to place your order.';
            if (/insufficient stock|unavailable|invalid cart item|cart must contain|cash on pickup.*disabled|settlement.*overdue/i.test(message)) {
                return res.status(409).json({ error: message });
            }
            return next(error);
        }
        if (!data?.order) return next(new Error('Checkout RPC returned no order.'));
        return res.status(data.duplicate ? 200 : 201).json({
            success: true, order: data.order, ...(data.duplicate ? { duplicate: true } : {}),
        });
    } catch (error) {
        return next(error);
    }
}

async function listMine(req, res, next) {
    try {
        const { data, error } = await supabase.from('orders')
            .select('id,vendor_id,customer_id,student_name,items,subtotal_price,service_fee,commission_amount,total_price,payment_method,payment_status,status,pickup_code,pickup_point,pickup_instructions,created_at,updated_at')
            .eq('customer_id', req.customer.id).order('created_at', { ascending: false }).limit(100);
        if (error) throw error;
        return res.json({ success: true, orders: data || [] });
    } catch (error) { return next(error); }
}

async function getMine(req, res, next) {
    try {
        const orderId = Number(req.params.orderId);
        if (!Number.isSafeInteger(orderId) || orderId <= 0) return res.status(400).json({ error: 'Invalid order ID.' });
        const { data, error } = await supabase.from('orders')
            .select('id,vendor_id,customer_id,student_name,items,subtotal_price,service_fee,commission_amount,total_price,payment_method,payment_status,status,pickup_code,pickup_point,pickup_instructions,created_at,updated_at')
            .eq('id', orderId).eq('customer_id', req.customer.id).maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Order not found.' });
        return res.json({ success: true, order: data });
    } catch (error) { return next(error); }
}

module.exports = { feePreview, create, listMine, getMine };
