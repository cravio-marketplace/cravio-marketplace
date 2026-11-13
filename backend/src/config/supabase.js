/**
 * Supabase client configuration.
 *
 * The service-role client is server-only and is used for trusted database
 * operations. The separate auth client handles password/OTP flows so a
 * customer's or vendor's sign-in session can never replace the service-role
 * Authorization header on the shared database client.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    supabaseServiceKey;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
        '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
            'Set them in backend/.env / Render environment.'
    );
}

if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_PUBLISHABLE_KEY) {
    console.warn(
        '[supabase] SUPABASE_ANON_KEY is not set. Auth is using an isolated ' +
            'service-key client as a temporary fallback. Set the anon/publishable key.'
    );
}

const authOptions = {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
    },
};

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, authOptions);
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, authOptions);

// Preserve the existing default export: all existing DB/controller imports
// continue to use the service-role client.
module.exports = supabaseAdmin;
module.exports.admin = supabaseAdmin;
module.exports.auth = supabaseAuth;
