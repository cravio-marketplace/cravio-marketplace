const supabase = require('../config/supabase');

async function resetVendorActivation(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vendorId)) {
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

async function createVendorSettlement(req, res, next) {
    try {
        const vendorId = String(req.params.vendorId || '');
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(vendorId)) {
            return res.status(400).json({ error: 'A valid vendor ID is required.' });
        }

        const periodStart = req.body?.period_start;
        const periodEnd = req.body?.period_end;
        const onlineOffset = req.body?.online_earnings_offset_kobo ?? 0;
        const cashRemitted = req.body?.cash_remitted_kobo ?? 0;
        const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : null;

        if (typeof periodStart !== 'string' || !Number.isFinite(Date.parse(periodStart))
            || typeof periodEnd !== 'string' || !Number.isFinite(Date.parse(periodEnd))
            || Date.parse(periodEnd) <= Date.parse(periodStart)) {
            return res.status(400).json({ error: 'Provide a valid settlement period. The end must be after the start.' });
        }

        const validKoboAmount = (value) =>
            Number.isSafeInteger(value) && value >= 0;
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
        if (error) throw error;

        return res.status(201).json({ success: true, settlement: data });
    } catch (error) {
        return next(error);
    }
}

module.exports = { resetVendorActivation, createVendorSettlement };
