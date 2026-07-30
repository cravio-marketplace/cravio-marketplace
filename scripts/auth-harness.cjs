/**
 * Local harness for the auth controller.
 *
 * Stubs:
 *   - backend/src/config/supabase        (in-memory user/vendor store)
 *   - backend/src/services/notifications (records calls, no fetch)
 *
 * Boots a tiny Express app, mounts /api/auth/login and /api/auth/signup with
 * the REAL controller functions, and runs a series of curl-equivalent
 * assertions. Prints PASS/FAIL per scenario.
 */
const path = require('path');
const Module = require('module');

// --- 1. Stub the Supabase client before the controller loads it. -----------
const backend = path.resolve(__dirname, '../backend/src');

// In-memory vendor store
const vendors = new Map();
let userCounter = 0;
const users = new Map();

// In-memory OTP store keyed by `email|phone`
const otpStore = new Map();

const supabaseStub = {
    auth: {
        signInWithPassword: async ({ email, password }) => {
            const user = users.get(email);
            if (!user || user.password !== password) {
                return { data: null, error: { message: 'Invalid login credentials' } };
            }
            return {
                data: {
                    user: { id: user.id },
                    session: { access_token: `tok_${user.id}` },
                },
                error: null,
            };
        },
        signInWithOtp: async (creds) => {
            // Mirror the production setup where Supabase is configured to
            // create users on OTP request. We always accept and store the
            // code under the email|phone composite key.
            // Phone channel simulation: +1 prefix marks "provider not
            // configured" so the controller exercises the error branch.
            if (creds.phone && creds.phone.startsWith('+1')) {
                return { data: null, error: { message: 'Phone provider not configured' } };
            }
            const key = `${creds.email || ''}|${creds.phone || ''}`;
            otpStore.set(key, '123456');
            return { data: { user: null, session: null }, error: null };
        },
        verifyOtp: async (creds) => {
            const key = `${creds.email || ''}|${creds.phone || ''}`;
            const expected = otpStore.get(key);
            if (!expected) {
                return { data: null, error: { message: 'No OTP requested' } };
            }
            if (expected !== creds.token) {
                return { data: null, error: { message: 'Invalid or expired OTP' } };
            }
            otpStore.delete(key);
            return { data: { user: null, session: null }, error: null };
        },
        admin: {
            createUser: async ({ email, password }) => {
                if (users.has(email)) {
                    return { data: null, error: { message: 'User already registered' } };
                }
                const id = `u_${++userCounter}`;
                users.set(email, { id, email, password });
                return { data: { user: { id, email } }, error: null };
            },
            deleteUser: async (id) => {
                for (const [email, u] of users) if (u.id === id) users.delete(email);
                return { error: null };
            },
        },
    },
    from(table) {
        const builder = {
            _filters: {},
            _table: table,
            select() { return this; },
            eq(col, val) { this._filters[col] = val; return this; },
            _firstMatch() {
                for (const v of vendors.values()) {
                    const f = this._filters || {};
                    if (Object.keys(f).every((k) => v[k] === f[k])) return v;
                }
                return null;
            },
            maybeSingle: async function () {
                if (this._table !== 'vendors') return { data: null };
                const v = this._firstMatch();
                return { data: v || null };
            },
            single: async function () {
                if (this._table !== 'vendors') return { data: null, error: { message: 'no rows' } };
                const v = this._firstMatch();
                return v
                    ? { data: v, error: null }
                    : { data: null, error: { message: 'no rows' } };
            },
            insert(row) {
                const v = { ...row };
                vendors.set(v.id, v);
                const self = this;
                return {
                    select() { return self; },
                    single: async () => ({ data: v, error: null }),
                };
            },
        };
        return builder;
    },
};

// Inject the stub via Node's resolver so when the controller does
// `require('../config/supabase')` it gets our object, not the real client.
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
    if (request === '../config/supabase' || request.endsWith('/config/supabase')) {
        return path.join(backend, 'config/supabase.js');
    }
    return origResolve.call(this, request, parent, ...rest);
};
require.cache[path.join(backend, 'config/supabase.js')] = {
    id: path.join(backend, 'config/supabase.js'),
    filename: path.join(backend, 'config/supabase.js'),
    loaded: true,
    exports: supabaseStub,
};

// --- 2. Stub notifications so Formspree is never called. -------------------
require.cache[path.join(backend, 'services/notifications.js')] = {
    id: path.join(backend, 'services/notifications.js'),
    filename: path.join(backend, 'services/notifications.js'),
    loaded: true,
    exports: {
        sendAdminNotification: async () => {},
        sendVendorEmail: async () => {},
    },
};

// --- 3. Boot a tiny Express app. -------------------------------------------
const express = require(path.join(__dirname, '../backend/node_modules/express'));
const { login, signup } = require(path.join(backend, 'controllers/auth.controller'));
const { sendOtp, verifyOtp } = require(path.join(backend, 'controllers/otp.controller'));

const app = express();
app.use(express.json());
app.post('/api/auth/login', login);
app.post('/api/auth/signup', signup);
app.post('/api/auth/send-otp', sendOtp);
app.post('/api/auth/verify-otp', verifyOtp);

const server = app.listen(0);
const port = server.address().port;

// --- 4. Tiny test runner. --------------------------------------------------
const results = [];
async function run(label, fn) {
    try {
        await fn();
        results.push({ label, status: 'PASS' });
        console.log(`  PASS  ${label}`);
    } catch (err) {
        results.push({ label, status: 'FAIL', err });
        console.log(`  FAIL  ${label}`);
        console.log(`        ${err.message}`);
    }
}

async function request(method, path, body) {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json };
}

function assertEq(actual, expected, msg) {
    if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
}
function assertHas(obj, key, msg) {
    if (!(key in obj)) throw new Error(`${msg}: missing key '${key}' in ${JSON.stringify(obj)}`);
}

(async () => {
    console.log('\n--- auth.controller harness ---\n');

    await run('signup: empty body → 400', async () => {
        const r = await request('POST', '/api/auth/signup', {});
        assertEq(r.status, 400, 'status');
        assertHas(r.json, 'error', 'error key');
    });

    await run('signup: short password → 400', async () => {
        const r = await request('POST', '/api/auth/signup', {
            email: 'short@cravio-test.com',
            password: 'abc',
            business_name: 'X',
            phone: '08012345678',
        });
        assertEq(r.status, 400, 'status');
        if (!/at least 8 characters/i.test(r.json.error)) {
            throw new Error(`unexpected error: ${r.json.error}`);
        }
    });

    await run('signup: missing business_name → 400', async () => {
        const r = await request('POST', '/api/auth/signup', {
            email: 'a@b.com', password: 'TestPass123', phone: '08012345678',
        });
        assertEq(r.status, 400, 'status');
    });

    await run('signup: invalid phone → real call (accepted server-side)', async () => {
        // Backend does NOT validate phone format today — that's a UI-layer
        // concern. We just confirm it doesn't 4xx and creates the vendor.
        const r = await request('POST', '/api/auth/signup', {
            email: 'badphone@cravio-test.com',
            password: 'TestPass123',
            business_name: 'BP',
            phone: '1234',
        });
        // 200 OR a duplicate from a previous run; either is fine.
        if (r.status !== 200 && r.status !== 409) {
            throw new Error(`unexpected status ${r.status}: ${JSON.stringify(r.json)}`);
        }
    });

    await run('signup: happy path → 200', async () => {
        const r = await request('POST', '/api/auth/signup', {
            email: 'happy@cravio-test.com',
            password: 'TestPass123',
            business_name: 'Happy Kitchen',
            phone: '08011111111',
            cac_document_url: 'https://example.com/cac.pdf',
        });
        assertEq(r.status, 200, 'status');
        assertEq(r.json.success, true, 'success');
    });

    await run('signup: duplicate email → 409 code=duplicate_email', async () => {
        const r = await request('POST', '/api/auth/signup', {
            email: 'happy@cravio-test.com',
            password: 'TestPass123',
            business_name: 'Dup',
            phone: '08022222222',
        });
        assertEq(r.status, 409, 'status');
        assertEq(r.json.code, 'duplicate_email', 'code');
    });

    await run('signup: duplicate phone → 409 code=duplicate_phone', async () => {
        const r = await request('POST', '/api/auth/signup', {
            email: 'different@cravio-test.com',
            password: 'TestPass123',
            business_name: 'Dup2',
            phone: '08011111111',
        });
        assertEq(r.status, 409, 'status');
        assertEq(r.json.code, 'duplicate_phone', 'code');
    });

    // --- login paths ---
    await run('login: no body → 400', async () => {
        const r = await request('POST', '/api/auth/login', {});
        assertEq(r.status, 400, 'status');
    });

    await run('login: wrong password → 401', async () => {
        const r = await request('POST', '/api/auth/login', {
            email: 'happy@cravio-test.com', password: 'WrongPass999',
        });
        assertEq(r.status, 401, 'status');
    });

    await run('login: pending vendor → 403 verification_status=pending', async () => {
        const r = await request('POST', '/api/auth/login', {
            email: 'happy@cravio-test.com', password: 'TestPass123',
        });
        assertEq(r.status, 403, 'status');
        assertEq(r.json.verification_status, 'pending', 'verification_status');
    });

    // Promote the vendor to "open" and try again
    {
        const v = [...vendors.values()].find((v) => v.email === 'happy@cravio-test.com');
        v.verification_status = 'open';
    }

    await run('login: approved vendor → 200 + token', async () => {
        const r = await request('POST', '/api/auth/login', {
            email: 'happy@cravio-test.com', password: 'TestPass123',
        });
        assertEq(r.status, 200, 'status');
        assertHas(r.json, 'token', 'token');
        assertHas(r.json, 'vendor', 'vendor');
        if (!r.json.token.startsWith('tok_')) {
            throw new Error(`unexpected token format: ${r.json.token}`);
        }
    });

    // Reject another vendor and verify the rejection reason comes through
    const rejectEmail = 'reject@cravio-test.com';
    const rejectPhone = '08033333333';
    await request('POST', '/api/auth/signup', {
        email: rejectEmail, password: 'TestPass123',
        business_name: 'Rejected', phone: rejectPhone,
    });
    {
        const v = [...vendors.values()].find((v) => v.email === rejectEmail);
        v.verification_status = 'rejected';
        v.rejected_reason = 'CAC document unreadable';
    }

    await run('login: rejected vendor → 403 with rejected_reason', async () => {
        const r = await request('POST', '/api/auth/login', {
            email: rejectEmail, password: 'TestPass123',
        });
        assertEq(r.status, 403, 'status');
        assertEq(r.json.verification_status, 'rejected', 'verification_status');
        assertEq(r.json.rejected_reason, 'CAC document unreadable', 'rejected_reason');
    });

    await run('login: rejected vendor with no reason → reason is null', async () => {
        const v2Email = 'reject2@cravio-test.com';
        await request('POST', '/api/auth/signup', {
            email: v2Email, password: 'TestPass123',
            business_name: 'Rejected2', phone: '08044444444',
        });
        const v = [...vendors.values()].find((v) => v.email === v2Email);
        v.verification_status = 'rejected';
        v.rejected_reason = null;

        const r = await request('POST', '/api/auth/login', {
            email: v2Email, password: 'TestPass123',
        });
        assertEq(r.status, 403, 'status');
        assertEq(r.json.verification_status, 'rejected', 'verification_status');
        if (r.json.rejected_reason !== null) {
            throw new Error(`expected null, got ${r.json.rejected_reason}`);
        }
    });

    // --- OTP paths ---
    await run('send-otp: missing fields → 400', async () => {
        const r = await request('POST', '/api/auth/send-otp', { email: 'a@b.com' });
        assertEq(r.status, 400, 'status');
    });

    await run('send-otp: happy path → 200 with channels', async () => {
        const r = await request('POST', '/api/auth/send-otp', {
            email: 'otp1@cravio-test.com',
            phone: '08055555555',
        });
        assertEq(r.status, 200, 'status');
        if (r.json.channels.email !== 'sent') {
            throw new Error(`email not sent: ${r.json.channels.email}`);
        }
    });

    await run('send-otp: phone channel error is reported, not 4xx', async () => {
        const r = await request('POST', '/api/auth/send-otp', {
            email: 'otp2@cravio-test.com',
            phone: '+15551234567', // stub marks +1 as provider-not-configured
        });
        assertEq(r.status, 200, 'status');
        assertEq(r.json.channels.email, 'sent', 'email channel');
        assertEq(r.json.channels.phone, 'error', 'phone channel');
    });

    await run('verify-otp: missing fields → 400', async () => {
        const r = await request('POST', '/api/auth/verify-otp', { email: 'a@b.com' });
        assertEq(r.status, 400, 'status');
    });

    await run('verify-otp: wrong code → 400', async () => {
        await request('POST', '/api/auth/send-otp', {
            email: 'otp3@cravio-test.com',
            phone: '08066666666',
        });
        const r = await request('POST', '/api/auth/verify-otp', {
            email: 'otp3@cravio-test.com',
            phone: '08066666666',
            email_token: '000000',
            phone_token: '123456',
        });
        assertEq(r.status, 400, 'status');
        assertEq(r.json.code, 'invalid_email_token', 'code');
    });

    await run('verify-otp: correct codes → 200', async () => {
        await request('POST', '/api/auth/send-otp', {
            email: 'otp4@cravio-test.com',
            phone: '08077777777',
        });
        const r = await request('POST', '/api/auth/verify-otp', {
            email: 'otp4@cravio-test.com',
            phone: '08077777777',
            email_token: '123456',
            phone_token: '123456',
        });
        assertEq(r.status, 200, 'status');
        assertEq(r.json.success, true, 'success');
    });

    server.close();
    const failed = results.filter((r) => r.status === 'FAIL').length;
    console.log(`\n${results.length - failed}/${results.length} passed\n`);
    process.exit(failed === 0 ? 0 : 1);
})();