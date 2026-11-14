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

module.exports = { resetVendorActivation };
