/**
 * Auth controller — login and signup.
 *
 * Sign-up is three-step:
 *   1. Pre-check the `vendors` table for duplicate email / phone so we don't
 *      leak Supabase Auth internals as a 500.
 *   2. Create a Supabase Auth user with `email_confirm: false`.
 *   3. Insert a row into `vendors` with `verification_status = 'pending'`.
 *
 * An admin has to flip verification_status to `open` before the user can log
 * in. The login endpoint reflects that status back so the UI can route to the
 * right pending / rejected screen.
 */
const supabase = require('../config/supabase');
const { sendAdminNotification } = require('../services/notifications');
const { scoreSignup, flagIfSuspicious } = require('../services/risk');
const { toE164 } = require('../services/phone');

const MIN_PASSWORD_LENGTH = 8;

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Returns: { success, token, vendor } or 401/403 on rejection.
 */
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });

    const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (vendorError || !vendor) {
        return res.status(403).json({ error: 'Not a registered vendor' });
    }

    if (vendor.verification_status === 'pending') {
        return res.status(403).json({
            error: 'Account pending admin approval',
            verification_status: 'pending',
        });
    }
    if (vendor.verification_status === 'rejected') {
        return res.status(403).json({
            error: `Account rejected: ${vendor.rejected_reason || 'Please contact support'}`,
            verification_status: 'rejected',
            rejected_reason: vendor.rejected_reason || null,
        });
    }

    res.json({
        success: true,
        token: data.session.access_token,
        vendor,
    });
}

/**
 * POST /api/auth/signup
 * Body: {
 *   email, password, business_name, phone, description?, address?,
 *   opening_hours?, cac_document_url?
 * }
 */
async function signup(req, res) {
    const {
        email,
        password,
        business_name,
        phone,
        description,
        address,
        opening_hours,
        cac_document_url,
    } = req.body;

    if (!email || !password || !business_name || !phone) {
        return res
            .status(400)
            .json({ error: 'Email, password, business name, and phone are required' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return res
            .status(400)
            .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    // Step 1: duplicate guard. We check the vendors table (not auth.users)
    // because that's the source of truth for vendor uniqueness, and it gives
    // us a stable, human-readable error code instead of Supabase's raw 500.
    const { data: existingEmail } = await supabase
        .from('vendors')
        .select('id')
        .eq('email', email)
        .maybeSingle();
    if (existingEmail) {
        return res
            .status(409)
            .json({ error: 'An account with that email already exists', code: 'duplicate_email' });
    }

    const phoneE164 = toE164(phone);
    const { data: existingPhone } = await supabase
        .from('vendors')
        .select('id')
        .eq('phone', phoneE164 || phone)
        .maybeSingle();
    if (existingPhone) {
        return res
            .status(409)
            .json({ error: 'An account with that phone number already exists', code: 'duplicate_phone' });
    }

    // Step 2: create Supabase auth user (unconfirmed so they can't log in until approved).
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
    });
    if (authError) {
        // Supabase will return "User already registered" here if the auth
        // email exists but the vendors row was deleted — surface it the same
        // way as the vendors check above so the UI has one path to render.
        if (/already registered/i.test(authError.message || '')) {
            return res
                .status(409)
                .json({ error: 'An account with that email already exists', code: 'duplicate_email' });
        }
        return res.status(500).json({ error: authError.message });
    }

    // Step 3: insert vendor row with pending status.
    const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .insert({
            id: authData.user.id,
            email,
            phone: phoneE164 || phone,
            business_name,
            description: description || null,
            address: address || null,
            opening_hours: opening_hours || null,
            cac_document_url: cac_document_url || null,
            verification_status: 'pending',
            is_accepting_orders: false,
        })
        .select()
        .single();

    if (vendorError) {
        // Clean up the auth user so we don't leave an orphan.
        await supabase.auth.admin.deleteUser(authData.user.id);
        return res.status(500).json({ error: vendorError.message });
    }

    // Step 3.5: score the signup for fake-account signals. Pure-function,
    // so we always know the result even if the persistence fails. The
    // vendor can still sign in — flagged accounts are surfaced in the
    // admin dashboard via v_suspicious_vendors for manual review.
    const channel = phoneE164 ? 'phone' : 'email';
    const risk = scoreSignup({
        channel,
        value: channel === 'phone' ? phoneE164 : email,
    });
    await flagIfSuspicious({
        vendorId: vendor.id,
        channel,
        value: channel === 'phone' ? phoneE164 : email,
        risk,
    });

    // Step 4: ping the admin so they know there's a new applicant.
    // Fire-and-forget: a flaky notification provider must not break signup.
    sendAdminNotification({
        subject: 'New Vendor Registration',
        body:
            `Business: ${business_name}\n` +
            `Email: ${email}\n` +
            `Phone: ${phone}\n` +
            `Description: ${description || 'N/A'}\n` +
            `CAC: ${cac_document_url || 'not provided'}`,
        vendor,
    });

    res.json({
        success: true,
        message: 'Account created. Awaiting admin approval.',
        risk: {
            score: risk.score,
            is_suspicious: risk.is_suspicious,
        },
    });
}

module.exports = { login, signup };