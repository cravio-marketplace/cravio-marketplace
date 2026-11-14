const supabase = require('../config/supabase');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPeriod(periodStart, periodEnd) {
    return typeof periodStart === 'string'
        && Number.isFinite(Date.parse(periodStart))
        && typeof periodEnd === 'string'
        && Number.isFinite(Date.parse(periodEnd))
        && Date.parse(periodEnd) > Date.parse(periodStart);
}

function mapSettlementError(error) {
    const statusByCode = {
        '22023': 400,
        '22003': 400,
        'P0002': 404,
        'P0001': 409,
        '23505': 409,
    };
    if (error && statusByCode[error.code]) {
        error.status = statusByCode[error.code];
    }
    return error;
}

async function resetVendorActivation(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        if (!UUID_RE.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor ID is required.' });
        }
        const { data, error } = await supabase.rpc('admin_reset_vendor_activation', {
            p_vendor_id: vendorId,
            p_activated_at: new Date().toISOString(),
        });
        if (error) throw error;
        return res.json({ success: true, message: 'Vendor free-commission period reset.', vendor: data });
    } catch (error) {
        return next(error);
    }
}

async function getVendorSettlementSummary(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        const { period_start: periodStart, period_end: periodEnd } = req.query;

        if (!UUID_RE.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor ID is required.' });
        }
        if (!validPeriod(periodStart, periodEnd)) {
            return res.status(400).json({ error: 'Provide a valid settlement period. The end must be after the start.' });
        }

        const start = new Date(periodStart).toISOString();
        const end = new Date(periodEnd).toISOString();
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id,total_price,service_fee,commission_amount,completed_at,settlement_due_at')
            .eq('vendor_id', vendorId)
            .eq('payment_method', 'cash')
            .eq('status', 'completed')
            .gte('completed_at', start)
            .lt('completed_at', end)
            .order('completed_at', { ascending: true });

        if (ordersError) throw ordersError;

        const orderIds = (orders || []).map((order) => order.id);
        let settlementLines = [];
        if (orderIds.length) {
            const { data, error } = await supabase
                .from('vendor_settlement_lines')
                .select('order_id,amount_kobo')
                .in('order_id', orderIds);
            if (error) throw error;
            settlementLines = data || [];
        }

        const settledByOrder = new Map();
        for (const line of settlementLines) {
            const amount = Number(line.amount_kobo);
            if (!Number.isSafeInteger(amount) || amount < 0) {
                throw new Error('A settlement ledger entry contains an invalid amount.');
            }
            const key = String(line.order_id);
            settledByOrder.set(key, (settledByOrder.get(key) || 0) + amount);
        }

        const orderSummaries = (orders || []).map((order) => {
            const serviceFee = Number(order.service_fee || 0);
            const commission = Number(order.commission_amount || 0);
            const settled = settledByOrder.get(String(order.id)) || 0;
            const outstanding = Math.max(0, serviceFee + commission - settled);
            return {
                order_id: order.id,
                completed_at: order.completed_at,
                settlement_due_at: order.settlement_due_at,
                gross_cash_collected_kobo: Number(order.total_price || 0),
                service_fee_kobo: serviceFee,
                commission_kobo: commission,
                already_settled_kobo: settled,
                outstanding_kobo: outstanding,
                overdue: outstanding > 0 && Boolean(order.settlement_due_at)
                    && Date.parse(order.settlement_due_at) < Date.now(),
            };
        });

        const totals = orderSummaries.reduce((sum, order) => ({
            gross_cash_collected_kobo: sum.gross_cash_collected_kobo + order.gross_cash_collected_kobo,
            service_fee_due_kobo: sum.service_fee_due_kobo + order.service_fee_kobo,
            commission_due_kobo: sum.commission_due_kobo + order.commission_kobo,
            already_settled_kobo: sum.already_settled_kobo + order.already_settled_kobo,
            outstanding_kobo: sum.outstanding_kobo + order.outstanding_kobo,
            overdue_orders: sum.overdue_orders + (order.overdue ? 1 : 0),
        }), {
            gross_cash_collected_kobo: 0,
            service_fee_due_kobo: 0,
            commission_due_kobo: 0,
            already_settled_kobo: 0,
            outstanding_kobo: 0,
            overdue_orders: 0,
        });

        if (Object.values(totals).some((value) => !Number.isSafeInteger(value) || value < 0)) {
            return res.status(422).json({ error: 'Settlement totals exceed the safe calculation range.' });
        }

        return res.json({
            success: true,
            vendor_id: vendorId,
            period_start: start,
            period_end: end,
            orders_count: orderSummaries.length,
            ...totals,
            orders: orderSummaries,
        });
    } catch (error) {
        return next(error);
    }
}

async function createVendorSettlement(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        if (!UUID_RE.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor ID is required.' });
        }

        const periodStart = req.body?.period_start;
        const periodEnd = req.body?.period_end;
        const onlineOffset = req.body?.online_earnings_offset_kobo ?? 0;
        const cashRemitted = req.body?.cash_remitted_kobo ?? 0;
        const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : null;

        if (!validPeriod(periodStart, periodEnd)) {
            return res.status(400).json({ error: 'Provide a valid settlement period. The end must be after the start.' });
        }

        const validKoboAmount = (value) => Number.isSafeInteger(value) && value >= 0;
        if (!validKoboAmount(onlineOffset) || !validKoboAmount(cashRemitted)
            || onlineOffset + cashRemitted <= 0
            || !Number.isSafeInteger(onlineOffset + cashRemitted)) {
            return res.status(400).json({ error: 'Settlement amounts must be non-negative whole kobo amounts, with a positive total.' });
        }

        const { data, error } = await supabase.rpc('admin_create_vendor_settlement', {
            p_vendor_id: vendorId,
            p_period_start: new Date(periodStart).toISOString(),
            p_period_end: new Date(periodEnd).toISOString(),
            p_online_earnings_offset_kobo: onlineOffset,
            p_cash_remitted_kobo: cashRemitted,
            p_notes: notes,
        });
        if (error) throw mapSettlementError(error);

        return res.status(201).json({ success: true, settlement: data });
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    resetVendorActivation,
    getVendorSettlementSummary,
    createVendorSettlement,
};
