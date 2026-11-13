/**
 * Auth controller — login and signup.
 *
 * Database reads/writes use the isolated service-role client. Password
 * authentication uses a separate client so concurrent logins cannot replace
 * the service-role token used by database operations.
 */
const supabase = require('../config/supabase');
const supabaseAuth = supabase.authClient;
const { sendAdminNotification } = require('../services/notifications');
const { scoreSignup, flagIfSuspicious } = require('../services/risk');
const { toE164 } = require('../services/phone');

const MIN_PASSWORD_LENGTH = 8;

async function login(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) {
        if (/invalid login credentials/i.test(error.message || '')) {
            return res.status(401).json({
                error: 'Incorrect email or password.',
                code: 'INVALID_CREDENTIALS',
            });
        }
        console.error('[LOGIN] Supabase authentication failed:', error.message);
        return res.status(401).json({ error: 'Unable to sign in. Please try again.', code: 'LOGIN_FAILED' });
    }

    if (!data?.user?.email_confirmed_at) {
        return res.status(403).json({
            error: 'Please verify your email before logging in.',
            code: 'EMAIL_NOT_VERIFIED',
        });
    }

    const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (vendorError || !vendor) {
        console.error('[LOGIN] Vendor profile lookup failed:', vendorError?.message || 'No vendor row');
        return res.status(403).json({ error: 'Not a registered vendor' });
    }

    if (vendor.verification_status === 'pending') {
        return res.status(403).json({
            error: 'Your account is pending verification. Please check your email.',
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
    // Keep login consistent with verifyVendor middleware and the accepted
    // status used by the vendor policies.
    if (vendor.verification_status !== 'accepted') {
        return res.status(403).json({
            error: 'Your account has not been approved yet.',
            verification_status: vendor.verification_status || 'pending',
        });
    }

    return res.json({
        success: true,
        token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        vendor,
    });
}

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
    } = req.body || {};

    if (!email || !password || !business_name || !phone) {
        return res.status(400).json({
            error: 'Email, password, business name, and phone are required',
        });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
    }

    try {
        const normalizedEmail = String(email).trim().toLowerCase();
        const phoneE164 = toE164(phone);

        const { data: existingEmail, error: emailLookupError } = await supabase
            .from('vendors')
            .select('id')
            .ilike('email', normalizedEmail)
            .maybeSingle();
        if (emailLookupError) {
            console.error('[SIGNUP] Email duplicate check failed:', emailLookupError);
            return res.status(500).json({ error: 'Unable to validate signup details. Please try again.' });
        }
        if (existingEmail) {
            return res.status(409).json({
                error: 'An account with that email already exists',
                code: 'duplicate_email',
            });
        }

        const { data: existingPhone, error: phoneLookupError } = await supabase
            .from('vendors')
            .select('id')
            .eq('phone', phoneE164 || phone)
            .maybeSingle();
        if (phoneLookupError) {
            console.error('[SIGNUP] Phone duplicate check failed:', phoneLookupError);
            return res.status(500).json({ error: 'Unable to validate signup details. Please try again.' });
        }
        if (existingPhone) {
            return res.status(409).json({
                error: 'An account with that phone number already exists',
                code: 'duplicate_phone',
            });
        }

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            password,
            email_confirm: false,
            user_metadata: { role: 'vendor' },
        });

        if (authError) {
            if (/already registered/i.test(authError.message || '')) {
                return res.status(409).json({
                    error: 'An account with that email already exists',
                    code: 'duplicate_email',
                });
            }
            console.error('[SIGNUP] Auth user creation failed:', authError);
            return res.status(500).json({ error: authError.message || 'Unable to create account.' });
        }

        const authUserId = authData.user.id;
        const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({
                id: authUserId,
                email: normalizedEmail,
                phone: phoneE164 || phone,
                business_name: String(business_name).trim(),
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
            console.error('[SIGNUP] Vendor insert failed:', {
                message: vendorError.message,
                code: vendorError.code,
                details: vendorError.details,
                hint: vendorError.hint,
            });

            const { error: cleanupError } = await supabase.auth.admin.deleteUser(authUserId);
            if (cleanupError) {
                console.error('[SIGNUP] Failed to clean up orphan Auth user:', cleanupError.message);
            }

            return res.status(500).json({
                error: 'Could not create vendor profile. Please try again or contact support.',
                code: vendorError.code || 'VENDOR_PROFILE_INSERT_FAILED',
            });
        }

        const channel = phoneE164 ? 'phone' : 'email';
        const risk = scoreSignup({
            channel,
            value: channel === 'phone' ? phoneE164 : normalizedEmail,
        });

        try {
            await flagIfSuspicious({
                vendorId: vendor.id,
                channel,
                value: channel === 'phone' ? phoneE164 : normalizedEmail,
                risk,
            });
        } catch (riskError) {
            console.error('[SIGNUP] Risk flag persistence failed:', riskError.message);
        }

        // Notification delivery is deliberately non-blocking for signup.
        Promise.resolve(sendAdminNotification({
            subject: 'New Vendor Registration',
            body:
                `Business: ${business_name}\n` +
                `Email: ${normalizedEmail}\n` +
                `Phone: ${phone}\n` +
                `Description: ${description || 'N/A'}\n` +
                `CAC: ${cac_document_url || 'not provided'}`,
            vendor,
        })).catch((notificationError) => {
            console.error('[SIGNUP] Admin notification failed:', notificationError.message);
        });

        return res.status(201).json({
            success: true,
            message: 'Account created successfully. Please verify your email before signing in.',
            verificationRequired: true,
            approvalStatus: 'pending',
            risk: {
                score: risk.score,
                is_suspicious: risk.is_suspicious,
            },
        });
    } catch (error) {
        console.error('[SIGNUP] Unexpected error:', error);
        return res.status(500).json({
            error: 'Signup failed unexpectedly. Please try again.',
            code: 'SIGNUP_UNEXPECTED_ERROR',
        });
    }
}

module.exports = { login, signup };
