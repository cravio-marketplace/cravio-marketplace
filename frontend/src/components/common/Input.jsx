/**
 * Input — labelled text/number/email input with a consistent style.
 */
export default function Input({
    label,
    error,
    hint,
    className = '',
    id,
    ...rest
}) {
    const inputId = id || `in-${Math.random().toString(36).slice(2, 9)}`;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange
                    ${error ? 'border-red-400' : 'border-gray-200'}`}
                {...rest}
            />
            {error ? (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            ) : hint ? (
                <p className="mt-1 text-xs text-gray-400">{hint}</p>
            ) : null}
        </div>
    );
}
