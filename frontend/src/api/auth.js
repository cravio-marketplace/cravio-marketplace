/**
 * Auth API + Supabase auth helpers.
 *
 * Login and signup go through the backend (which owns the vendor row). Forgot
 * and reset password go directly to Supabase Auth — the backend has no role
 * to play since the user isn't authenticated yet.
 */
import API from './client';
import supabase from './supabaseClient';

export const login = (payload) => API.post('/auth/login', payload);
export const signup = (payload) => API.post('/auth/signup', payload);

export const changePassword = (payload) => API.post('/vendor/change-password', payload);

/**
 * Send a password-recovery email. The user clicks the link in their inbox
 * and lands on /reset-password with a recovery session in the URL hash.
 *
 * @param {string} email
 * @param {string} redirectTo absolute URL the recovery link will land on
 */
export async function requestPasswordReset(email, redirectTo) {
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

/**
 * Update the password for the currently authenticated Supabase user. Called
 * from /reset-password once the recovery session is active.
 */
export async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword });
}

/**
 * Returns true if Supabase detects an active recovery session in the URL
 * hash. Used by /reset-password to decide whether to show the form vs.
 * redirect to /forgot-password.
 */
export async function hasRecoverySession() {
    const { data } = await supabase.auth.getSession();
    return Boolean(data?.session);
}