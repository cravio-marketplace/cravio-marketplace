/**
 * Button — primary / secondary / ghost / danger variants.
 *
 * Uses brand orange by default; secondary is outlined, ghost is text-only.
 */
import { Loader2 } from 'lucide-react';

const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]';

const variants = {
    primary: 'bg-brand-orange text-white hover:bg-brand-orange-600 shadow-sm',
    secondary: 'bg-white text-brand-orange border border-brand-orange/30 hover:bg-brand-orange-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    soft: 'bg-brand-orange-50 text-brand-orange-700 hover:bg-brand-orange-100',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-3 text-base',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    className = '',
    type = 'button',
    ...rest
}) {
    return (
        <button
            type={type}
            disabled={loading || rest.disabled}
            className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
            {...rest}
        >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {children}
        </button>
    );
}
