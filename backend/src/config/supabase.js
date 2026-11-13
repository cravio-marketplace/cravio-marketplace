/**
 * Supabase client configuration.
 *
 * Database operations use the server-only service-role client. Password and
 * OTP flows use a separate client so user sessions never replace the
 * service-role Authorization header on the shared database client.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    supabaseServiceKey;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}
if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_PUBLISHABLE_KEY) {
    console.warn('[supabase] SUPABASE_ANON_KEY is not set; isolated auth client is using the service key fallback. Configure the anon/publishable key.');
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

// Keep the default export compatible with all existing database controllers.
// Do not use the property name "authClient" on the SDK's own "auth" property.
module.exports = supabaseAdmin;
module.exports.adminClient = supabaseAdmin;
module.exports.authClient = supabaseAuth;
