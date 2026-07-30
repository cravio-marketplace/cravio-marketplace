/**
 * PasswordStrength — a 4-segment meter that grades a password from "weak" to
 * "strong". Pure visual; the actual validation lives in
 * utils/validators#isStrongPassword. Hidden when the field is empty.
 */

function score(value) {
    if (!value) return 0;
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s; // 0..4
}

const LEVELS = [
    { label: 'Too short', color: 'bg-gray-200' },
    { label: 'Weak', color: 'bg-red-400' },
    { label: 'Fair', color: 'bg-amber-400' },
    { label: 'Good', color: 'bg-lime-500' },
    { label: 'Strong', color: 'bg-emerald-500' },
];

export default function PasswordStrength({ value = '' }) {
    const s = score(value);
    if (!value) return null;
    const { label, color } = LEVELS[s];
    return (
        <div className="mt-1.5" aria-live="polite">
            <div className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={s}>
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                            i < s ? color : 'bg-gray-200'
                        }`}
                    />
                ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
        </div>
    );
}