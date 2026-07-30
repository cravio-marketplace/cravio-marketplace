// Centralized formatters. All prices are stored in kobo (smallest unit).
// Every price display in the app should go through formatNaira.

export function formatNaira(kobo, options = {}) {
  const naira = (Number(kobo) || 0) / 100;
  if (options.compact && naira >= 1_000_000) {
    return `₦${(naira / 1_000_000).toFixed(1)}M`;
  }
  if (options.compact && naira >= 1_000) {
    return `₦${(naira / 1_000).toFixed(1)}k`;
  }
  return `₦${naira.toLocaleString('en-NG', {
    minimumFractionDigits: options.minDecimals ?? 2,
    maximumFractionDigits: options.maxDecimals ?? 2,
  })}`;
}

// Alias for clarity at call sites
export const naira = formatNaira;

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

export function formatPhoneNg(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural ?? singular + 's'}`;
}
