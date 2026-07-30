/**
 * Select — labelled native select styled to match Input.
 */
export default function Select({ label, error, options = [], className = '', ...rest }) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            )}
            <select
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition
                    focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange
                    ${error ? 'border-red-400' : 'border-gray-200'}`}
                {...rest}
            >
                {options.map((opt) =>
                    typeof opt === 'string' ? (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ) : (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    )
                )}
            </select>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
