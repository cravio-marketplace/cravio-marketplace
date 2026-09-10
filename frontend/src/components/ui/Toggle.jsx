/**
 * Toggle — accessible switch with a clear on/off visual.
 *
 * Active state uses brand-orange. Inactive state uses a visible gray track
 * (gray-300 thumb on a gray-200 track) — never plain white, so the control
 * is readable against a white card background.
 *
 * The thumb is a white circle that translates across the track. Focus ring
 * uses brand-orange-200 to match the Cravio palette.
 *
 * Accessibility:
 *   - role="switch" + aria-checked on the visible button
 *   - sr-only checkbox so label clicks work in form contexts
 *   - focus-visible ring around the track
 */
export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  description,
  id,
}) {
  const inputId = id || `toggle-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <label
      htmlFor={inputId}
      className={`flex items-center justify-between gap-3 py-1 ${
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <div className="flex-1 min-w-0">
        {label && <p className="text-sm font-medium text-gray-900">{label}</p>}
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={!!checked}
          aria-label={label || 'Toggle'}
          disabled={disabled}
          onClick={() => !disabled && onChange?.(!checked)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange-300 focus-visible:ring-offset-1 ${
            checked ? 'bg-brand-orange-500' : 'bg-gray-300'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
        <span className={`text-xs font-bold ${checked ? 'text-brand-orange-600' : 'text-gray-400'} ${disabled ? 'opacity-50' : ''}`}>
          {checked ? 'ON' : 'OFF'}
        </span>
      </div>

      <input
        id={inputId}
        type="checkbox"
        className="sr-only"
        checked={!!checked}
        onChange={(e) => !disabled && onChange?.(e.target.checked)}
        disabled={disabled}
        tabIndex={-1}
      />
    </label>
  );
}
