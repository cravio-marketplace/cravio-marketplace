/**
 * Toggle — iOS-style switch.
 */
export default function Toggle({ checked, onChange, label, description, disabled }) {
    return (
        <label
            className={`flex items-center justify-between gap-4 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
        >
            <div>
                <p className="font-medium text-gray-900">{label}</p>
                {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={!!checked}
                disabled={disabled}
                onClick={() => onChange?.(!checked)}
                className={`relative h-6 w-11 rounded-full transition ${
                    checked ? 'bg-brand-orange' : 'bg-gray-300'
                }`}
            >
                <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                        checked ? 'left-5' : 'left-0.5'
                    }`}
                />
            </button>
        </label>
    );
}
