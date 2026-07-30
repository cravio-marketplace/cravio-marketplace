/**
 * Textarea — same look as Input, multiline.
 */
export default function Textarea({ label, error, className = '', rows = 4, ...rest }) {
    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            )}
            <textarea
                rows={rows}
                className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm transition
                    placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange
                    ${error ? 'border-red-400' : 'border-gray-200'}`}
                {...rest}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
