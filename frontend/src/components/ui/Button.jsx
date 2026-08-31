import { Loader2 } from 'lucide-react';

/**
 * Cravio Button — five variants, three sizes.
 *
 * Why each variant looks the way it does:
 *  - primary:    solid brand-orange. The workhorse CTA.
 *  - secondary:  white with brand-orange-500 text and a visible brand-orange
 *                border. Used for secondary actions alongside a primary
 *                (e.g. "Cancel" / "Save draft"). The border keeps it from
 *                blending into a white card.
 *  - ghost:      transparent, neutral gray text, gray-100 hover. Used in
 *                dense toolbars where a button shouldn't compete with
 *                surrounding content. Not a primary CTA.
 *  - danger:     solid red-600 for destructive actions.
 *  - subtle:     gray-100 fill, gray-800 text. Used when a button needs to
 *                be visible but de-emphasised next to a primary action.
 */
const variants = {
  primary:
    'bg-brand-orange-500 text-white hover:bg-brand-orange-600 active:bg-brand-orange-700 disabled:bg-brand-orange-300 shadow-sm',
  secondary:
    'bg-white text-brand-orange-600 border border-brand-orange-400 hover:bg-brand-orange-50 active:bg-brand-orange-100 disabled:text-gray-400 disabled:border-gray-200 disabled:bg-white',
  ghost:
    'bg-transparent text-gray-700 border border-transparent hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 shadow-sm',
  subtle:
    'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 disabled:text-gray-400 border border-transparent',
};

const sizes = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
}
