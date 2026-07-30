/**
 * Phone number utilities.
 *
 * The app collects phone numbers in local Nigerian format (e.g. 08012345678)
 * but Supabase's phone OTP and Auth expect E.164 (+2348012345678). toE164
 * is the single conversion point so the rest of the code can stay simple.
 */

/**
 * Convert a Nigerian phone number to E.164.
 * Accepts: 08012345678, 2348012345678, +2348012345678.
 * Returns null if the input doesn't look like a Nigerian number.
 */
function toE164(input) {
    if (!input) return null;
    let s = String(input).replace(/[\s\-()]/g, '');
    if (s.startsWith('+')) return /^\+\d{10,15}$/.test(s) ? s : null;
    if (s.startsWith('234')) return s.length === 13 ? `+${s}` : null;
    if (s.startsWith('0') && s.length === 11) return `+234${s.slice(1)}`;
    return null;
}

module.exports = { toE164 };
