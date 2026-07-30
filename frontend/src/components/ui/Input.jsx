import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { label, hint, error, leftIcon, rightIcon, className = '', id, ...rest },
  ref
) {
  const reactId = useIdFallback(id);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={reactId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={reactId}
          ref={ref}
          className={`w-full h-10 rounded-xl border bg-white text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange-200 focus:border-brand-orange-400 disabled:bg-gray-50 disabled:text-gray-500 ${
            error ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-gray-200'
          } ${leftIcon ? 'pl-10' : 'pl-3'} ${rightIcon ? 'pr-10' : 'pr-3'} ${className}`}
          {...rest}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;

let _idCounter = 0;
function useIdFallback(id) {
  if (id) return id;
  // Stable per-render fallback (not React's useId because we want a single prop, not a hook change)
  return `input-${++_idCounter}`;
}
