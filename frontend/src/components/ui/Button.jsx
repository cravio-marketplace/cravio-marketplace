import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-brand-orange-500 text-white hover:bg-brand-orange-600 active:bg-brand-orange-700 disabled:bg-brand-orange-300 shadow-sm',
  secondary: 'bg-white text-brand-orange-600 border border-brand-orange-300 hover:bg-brand-orange-50 active:bg-brand-orange-100 disabled:text-gray-400 disabled:border-gray-200',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 shadow-sm',
  subtle: 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 disabled:text-gray-400',
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
      {loading ? <Loader2 size={16} className="animate-spin" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
}
