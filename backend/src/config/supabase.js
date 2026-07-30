/**
 * Supabase client configuration.
 *
 * We use the SERVICE_ROLE key on the backend so we can bypass Row Level Security
 * for trusted server-to-server work. The service role key MUST never be exposed
 * to the browser. All vendor authentication is done through Supabase Auth.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
        '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
            'Set them in backend/.env before starting the server.'
    );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

module.exports = supabase;
