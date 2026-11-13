/**
 * OTP controller — email or phone one-time-password verification.
 */
const supabaseAuth = require('../config/supabase').auth;
const { toE164 } = require('../services/phone');
const { scoreSignup, flagIfSuspicious } = require('../services/risk');

function pickAddress(body) {
    const channel = body?.channel === 'phone' ? 'phone' : 'email';
    if (channel === 'email') {
        return { channel, value: String(body?.email || '').trim() };
    }
    return { channel, value: toE164(String(body?.phone || '').trim()) };
}

async function sendOtp(req, res) {
    const { channel, value } = pickAddress(req.body);
    if (!value) return res.status(400).json({ error: `${channel} is required` });

    const payload = channel === 'email'
        ? { email: value, options: { shouldCreateUser: false } }
        : { phone: value, options: { shouldCreateUser: false } };

    const { error } = await supabaseAuth.auth.signInWithOtp(payload);
    if (error) {
        console.warn('[otp] send failed', { channel, error: error.message });
        return res.status(502).json({
            error: `Could not send ${channel} code. Try again in a moment.`,
            code: 'send_failed',
        });
    }
    return res.json({ success: true, channel, status: 'sent' });
}

async function verifyOtp(req, res) {
    const { channel, value } = pickAddress(req.body);
    const token = String(req.body?.token || '').trim();
    if (!value || !token) {
        return res.status(400).json({ error: `${channel} and code are required` });
    }

    const verifyArgs = channel === 'email'
        ? { email: value, token, type: 'email' }
        : { phone: value, token, type: 'sms' };

    const { error } = await supabaseAuth.auth.verifyOtp(verifyArgs);
    if (error) {
        return res.status(400).json({
            error: error.message || 'Code is invalid or expired',
            code: 'invalid_token',
        });
    }

    const risk = scoreSignup({ channel, value });
    return res.json({ success: true, channel, risk });
}

async function flagSignup(req, res) {
    const { channel, value, vendorId } = req.body || {};
    if (!channel || !value) {
        return res.status(400).json({ error: 'channel and value are required' });
    }
    const risk = scoreSignup({ channel, value });
    await flagIfSuspicious({ vendorId, channel, value, risk });
    return res.json({ success: true, risk });
}

module.exports = { sendOtp, verifyOtp, flagSignup };
