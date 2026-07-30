/**
 * Support tickets controller.
 *
 * Categories: Technical Issue, Order Problem, Menu Help, Billing, Other
 * Statuses : open → in_progress → resolved → closed
 */
const supabase = require('../config/supabase');
const { sendAdminNotification, sendVendorEmail } = require('../services/notifications');

const VALID_CATEGORIES = ['Technical Issue', 'Order Problem', 'Menu Help', 'Billing', 'Other'];

async function list(req, res) {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('vendor_id', req.vendor.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, tickets: data });
}

async function create(req, res) {
    const { subject, message, category } = req.body;
    if (!subject || !message) {
        return res.status(400).json({ error: 'Subject and message required' });
    }
    const finalCategory = VALID_CATEGORIES.includes(category) ? category : 'Other';

    const { data, error } = await supabase
        .from('support_tickets')
        .insert({
            vendor_id: req.vendor.id,
            subject,
            message,
            category: finalCategory,
            status: 'open',
        })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    // Fire-and-forget notifications
    await Promise.all([
        sendAdminNotification(
            `Support Ticket [${finalCategory}]: ${subject}`,
            `From vendor: ${req.vendor.business_name}\n\n${message}`,
            req.vendor
        ),
        sendVendorEmail(
            req.vendor.email,
            `We received your support ticket: ${subject}`,
            'Thanks for reaching out — our team will reply within 24 hours.'
        ),
    ]);

    res.json({ success: true, ticket: data });
}

module.exports = { list, create, VALID_CATEGORIES };
