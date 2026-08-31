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
 *   the browser Supabase client because the user isn't authenticated at the
 *   point they're called.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import supabase from '../api/supabaseClient';
import * as vendorApi from '../api/vendor';
import { NETWORK_ERROR_MESSAGE } from '../api/client';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const VENDOR_KEY = 'vendor';

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

    useEffect(() => {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    }, [token]);

    useEffect(() => {
        if (vendor) localStorage.setItem(VENDOR_KEY, JSON.stringify(vendor));
        else localStorage.removeItem(VENDOR_KEY);
    }, [vendor]);

    const value = useMemo(
        () => ({
            vendor,
            token,
            isAuthenticated: !!token && !!vendor,

            async signIn(payload) {
                try {
                    const { data } = await authApi.login(payload);
            
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
                    // best-effort — local clear still runs below
                } finally {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(VENDOR_KEY);

                    setToken(null);
                    setVendor(null);
                }
            },

            async refreshVendor() {
                try {
                    const { data } = await vendorApi.getMe();
                    // Backend returns { success, data: vendor } — accept both shapes.
                    const next = data?.data || data?.vendor || data;
                    if (next) setVendor(next);
                    return next;
                } catch (err) {
                    if (err?.response?.status === 401 || err?.response?.status === 403) {
                        // Token rejected — clear local state so the app falls back
                        // to the login screen rather than staying in a broken state.
                        localStorage.removeItem(TOKEN_KEY);
                        localStorage.removeItem(VENDOR_KEY);
                        setToken(null);
                        setVendor(null);
                    }
                    throw err;
                }
            },

            updateVendor: (patch) => setVendor((prev) => ({ ...(prev || {}), ...patch })),

            /** Trigger a password-recovery email via Supabase Auth. */
            async requestPasswordReset(email, redirectTo) {
                return authApi.requestPasswordReset(email, redirectTo);
            },

            /** Update the password for the current Supabase session. */
            async updatePassword(newPassword) {
                return authApi.updatePassword(newPassword);
            },
        }),
        [vendor, token]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}