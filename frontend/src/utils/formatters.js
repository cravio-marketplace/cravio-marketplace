/**
 * Formatting helpers used across the app.
 *
 * All money is stored in kobo (smallest Naira unit) so we don't deal with
 * floats — `formatNaira` divides by 100 for display.
 */

export function formatNaira(kobo) {
    const naira = (kobo || 0) / 100;
    return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleString('en-NG', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDateOnly(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function relativeTime(value) {
    if (!value) return '';
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}
