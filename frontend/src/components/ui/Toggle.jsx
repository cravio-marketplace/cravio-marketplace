export default function Toggle({ checked, onChange, disabled, label, description, id }) {
  const inputId = id || `toggle-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <label htmlFor={inputId} className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="flex-1">
        {label && <p className="text-sm font-medium text-gray-900">{label}</p>}
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange-200 ${
          checked ? 'bg-brand-orange-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <input
        id={inputId}
        type="checkbox"
        className="sr-only"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        tabIndex={-1}
      />
    </label>
  );
}
