/**
 * Badge — pill-shaped label with tone-based coloring.
 *
 * Accepts both `tone` (legacy: 'orange'|'green'|'blue'|'gray'|'red'|'yellow')
 * and `variant` (preferred: 'neutral'|'success'|'warning'|'danger'|'info'|'brand'|'outline').
 * `tone` is mapped onto the equivalent `variant` so existing call sites keep
 * working while new code can pick the more explicit `variant`.
 *
 * `dot` renders a small status dot before the children. Color of the dot
 * matches the badge tone so a green badge has a green dot.
 */
const TONE_TO_VARIANT = {
    gray: 'neutral',
    orange: 'warning',
    yellow: 'warning',
    green: 'success',
    blue: 'info',
    red: 'danger',
};

const variants = {
    neutral: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    danger: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    info: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
    brand: { bg: 'bg-brand-orange-50', text: 'text-brand-orange-700', dot: 'bg-brand-orange-500' },
    outline: { bg: 'bg-white', text: 'text-gray-700', dot: 'bg-gray-400' },
};

const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
};

export default function Badge({
    children,
    variant,
    tone,
    size = 'md',
    dot,
    className = '',
}) {
    const resolvedVariant = variant || TONE_TO_VARIANT[tone] || 'neutral';
    const v = variants[resolvedVariant];
    return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap ${v.bg} ${v.text} ${sizes[size]} ${className}`}
        >
          {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot === true ? v.dot : dot}`} />}
          {children}
        </span>
    );
}