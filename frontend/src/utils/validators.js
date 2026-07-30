/**
 * Tiny form validation helpers. The UI doesn't pull in a heavy validation
 * library — these cover the common vendor flows (signup, menu, support).
 */

export const required = (value) => {
    if (value === undefined || value === null || value === '') return 'Required';
    return null;
};

export const isEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Enter a valid email';

export const minLength = (n) => (value) =>
    value && value.length >= n ? null : `Must be at least ${n} characters`;

export const isPhone = (value) =>
    /^(\+?234|0)[789][01]\d{8}$/.test(String(value || '').replace(/\s/g, ''))
        ? null
        : 'Enter a valid Nigerian phone (e.g. 08012345678)';

/**
 * Password rule for new vendors: at least 8 characters, must contain both a
 * letter and a digit. Mirrors the backend's minimum-length check.
 */
export const isStrongPassword = (value) => {
    if (!value || value.length < 8) return 'Must be at least 8 characters';
    if (!/[A-Za-z]/.test(value)) return 'Must contain at least one letter';
    if (!/\d/.test(value)) return 'Must contain at least one number';
    return null;
};

/**
 * Passwords must match. Run after isStrongPassword on the password field.
 */
export const passwordsMatch = (a, b) => (a === b ? null : 'Passwords do not match');

export const isPositive = (value) =>
    Number(value) > 0 ? null : 'Must be greater than 0';

export function runValidators(value, validators) {
    for (const v of validators) {
        const result = v(value);
        if (result) return result;
    }
    return null;
}