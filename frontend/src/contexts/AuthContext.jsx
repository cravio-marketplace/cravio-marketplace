/**
 * Auth context.
 *
 * Stores the authenticated vendor + Supabase session token in a single
 * place so deep components don't have to thread props or read
 * `localStorage` directly.
 *
 * - Backend talks: login(), signup(), refreshVendor() go through the Express
 *   API (the API owns vendor row creation).
 * - Supabase-direct: requestPasswordReset() / updatePassword() go through
 *   the browser Supabase client because the user isn't authenticated at
 *   the point they're called.
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as authApi from '../api/auth';
import supabase from '../api/supabaseClient';
import * as vendorApi from '../api/vendor';
import { NETWORK_ERROR_MESSAGE } from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const VENDOR_KEY = 'vendor';

// To prevent race conditions in refreshVendor
let lastRefreshTimestamp = 0;

export function AuthProvider({ children }) {
    const [vendor, setVendor] = useState(() => {
        try {
            const raw = localStorage.getItem(VENDOR_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);

    // PERSISTENCE: Sync state to localStorage
    useEffect(() => {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    }, [token]);

    useEffect(() => {
        if (vendor) localStorage.setItem(VENDOR_KEY, JSON.stringify(vendor));
        else localStorage.removeItem(VENDOR_KEY);
    }, [vendor]);

    const refreshVendor = useCallback(async () => {
        if (!token) return null;

        const currentRequestTime = Date.now();
        lastRefreshTimestamp = currentRequestTime;

        try {
            const { data } = await vendorApi.getMe();
            const next = data?.data || data?.vendor || data;

            // If a newer request has already started, ignore this stale response
            if (currentRequestTime < lastRefreshTimestamp) return null;

            if (next) {
                setVendor(next);
                return next;
            }
            // If no vendor found but we have a token, we are in a broken state
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(VENDOR_KEY);
            setToken(null);
            setVendor(null);
        } catch (err) {
            if (err?.response?.status === 401 || err?.response?.status === 403) {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(VENDOR_KEY);
                setToken(null);
                setVendor(null);
            }
            throw err;
        }
    }, [token]);

    useEffect(() => {
        // DEBUG: Log the initial session check
        console.log('[AuthContext] Initializing... checking session');

        supabase.auth.getSession()
            .then(({ data }) => {
                const session = data?.session;
                if (session) {
                    console.log('[AuthContext] Found existing session for:', session.user.email);
                    setToken(session.access_token);
                    refreshVendor().catch(err => {
                        console.error('[AuthContext] Initial vendor refresh failed:', err);
                    });
                } else {
                    console.log('[AuthContext] No existing session found');
                }
            })
            .catch(err => {
                console.error('[AuthContext] Session fetch crash:', err);
            });

        // Listen for auth changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`[AuthContext] Auth Event: ${event}`, session?.user?.email);
            if (session) {
                setToken(session.access_token);
                refreshVendor().catch(() => {});
            } else {
                setToken(null);
                setVendor(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [refreshVendor]);

    const value = useMemo(
        () => ({
            vendor,
            token,
            isAuthenticated: !!token && !!vendor,

            async signIn(payload) {
                try {
                    // NUCLEAR OPTION: Clear all existing Supabase sessions
                    // before attempting a new login. This prevents Account A survival.
                    await supabase.auth.signOut();
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(VENDOR_KEY);

                    const { data } = await authApi.login(payload);

                    // 1. Sync the browser Supabase client FIRST
                    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                        access_token: data.token,
                        refresh_token: data.refresh_token,
                    });

                    if (sessionError) {
                        console.error('[AuthContext] setSession failed:', sessionError);
                    }

                    // 2. Update LocalStorage
                    localStorage.setItem(TOKEN_KEY, data.token);
                    localStorage.setItem(VENDOR_KEY, JSON.stringify(data.vendor));

                    // 3. Update React state
                    setToken(data.token);
                    setVendor(data.vendor);

                    return data.vendor;
                } catch (err) {
                    if (err.isNetworkError) {
                        const e = new Error(NETWORK_ERROR_MESSAGE);
                        e.isNetworkError = true;
                        throw e;
                    }
                    throw err;
                }
            },

            async signUp(payload) {
                try {
                    return await authApi.signup(payload);
                } catch (err) {
                    if (err.isNetworkError) {
                        const e = new Error(NETWORK_ERROR_MESSAGE);
                        e.isNetworkError = true;
                        throw e;
                    }
                    throw err;
                }
            },

            async signOut() {
                try {
                    await supabase.auth.signOut();
                } catch {
                    // best-effort
                } finally {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(VENDOR_KEY);
                    setToken(null);
                    setVendor(null);
                }
            },

            refreshVendor,

            updateVendor: (patch) => setVendor((prev) => ({ ...(prev || {}), ...patch })),

            async requestPasswordReset(email, redirectTo) {
                return authApi.requestPasswordReset(email, redirectTo);
            },

            async updatePassword(newPassword) {
                return authApi.updatePassword(newPassword);
            },
        }),
        [vendor, token, refreshVendor]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
