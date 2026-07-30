/**
 * OTP controller — single-channel one-time-password verification.
 *
 * Used by the vendor signup flow. The vendor picks email OR phone, the
 * backend sends a 6-digit code to that channel, they type it back, and only
 * then does the full signup form appear.
 *
 * Note: phone OTP requires Supabase's Phone provider to be enabled with
 * Twilio credentials. Email OTP works with the dev email provider out of
 * the box. If the channel isn't configured, sendOtp surfaces a 502 so the
 * UI can show "couldn't send code".
 */
const supabase = require('../config/supabase');
const { toE164 } = require('../services/phone');
const { scoreSignup, flagIfSuspicious } = require('../services/risk');

/**
 * Normalise the request body so the controllers don't have to repeat the
 * branching for channel / email / phone.
 */
function pickAddress(body) {
    const channel = body?.channel === 'phone' ? 'phone' : 'email';
    if (channel === 'email') {
        return { channel, value: String(body?.email || '').trim() };
    }
    const raw = String(body?.phone || '').trim();
    return { channel, value: toE164(raw) };
}

/**
 * POST /api/auth/send-otp
 * Body: { channel: 'email' | 'phone', email?, phone? }
 *
 * Returns: { success, channel, status: 'sent' } on success
 *          400 if the channel / address is missing or invalid
 *          502 if Supabase couldn't deliver the code
 */
async function sendOtp(req, res) {
    const { channel, value } = pickAddress(req.body);
    if (!value) {
        return res.status(400).json({ error: `${channel} is required` });
    }

    // Build the request shape Supabase expects. shouldCreateUser=false so a
    // random stranger can't use OTP to enumerate auth users — the actual
    // auth user is created in the signup step after verification.
    const payload =
        channel === 'email'
            ? { email: value, options: { shouldCreateUser: false } }
            : { phone: value, options: { shouldCreateUser: false } };

    const { error } = await supabase.auth.signInWithOtp(payload);
    if (error) {
        // We log internally but never echo the raw Supabase error to the
        // client — it leaks the existence of the account.
        // eslint-disable-next-line no-console
        console.warn('[otp] send failed', { channel, error: error.message });
        return res.status(502).json({
            error: `Could not send ${channel} code. Try again in a moment.`,
            code: 'send_failed',
        });
    }

    res.json({ success: true, channel, status: 'sent' });
}

/**
 * POST /api/auth/verify-otp
 * Body: { channel, email?, phone?, token }
 *
 * Returns: { success, risk } once the code has been accepted.
 *   `risk` is the result of the fake-account heuristics and is stashed
 *   into the verifiedContact sessionStorage by the frontend for the
 *   signup step to consume.
 */
async function verifyOtp(req, res) {
    const { channel, value } = pickAddress(req.body);
    const token = String(req.body?.token || '').trim();
    if (!value || !token) {
        return res.status(400).json({ error: `${channel} and code are required` });
    }

    const verifyArgs =
        channel === 'email'
            ? { email: value, token, type: 'email' }
            : { phone: value, token, type: 'sms' };

    const { error } = await supabase.auth.verifyOtp(verifyArgs);
    if (error) {
        return res.status(400).json({
            error: error.message || 'Code is invalid or expired',
            code: 'invalid_token',
        });
    }

    // Score the signup before we hand back to the UI. The frontend passes
    // the result forward to /api/auth/signup which uses it to set the
    // vendor's `risk_*` columns. This is a soft gate — the vendor can still
    // create an account; admins review flagged rows in the dashboard.
    const risk = scoreSignup({ channel, value });

    res.json({ success: true, channel, risk });
}

/**
 * POST /api/auth/flag-signup
 * Body: { channel, value, vendorId? }
 *
 * Convenience endpoint for the signup controller to persist risk flags
 * AFTER a vendor row is created. Kept here so the rest of the auth code
 * (login, signup) doesn't have to import the risk module directly.
 */
async function flagSignup(req, res) {
    const { channel, value, vendorId } = req.body || {};
    if (!channel || !value) {
        return res.status(400).json({ error: 'channel and value are required' });
    }
    const risk = scoreSignup({ channel, value });
    await flagIfSuspicious({ vendorId, channel, value, risk });
    res.json({ success: true, risk });
}

module.exports = { sendOtp, verifyOtp, flagSignup };
