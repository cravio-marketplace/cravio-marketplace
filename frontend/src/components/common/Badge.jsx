/**
 * Badge — small status pill.
 */
const tones = {
    orange: 'bg-brand-orange-50 text-brand-orange-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
    gray: 'bg-gray-100 text-gray-600',
    yellow: 'bg-yellow-50 text-yellow-700',
};

export default function Badge({ children, tone = 'gray', className = '', dot = false }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                tones[tone] || tones.gray
            } ${className}`}
        >
            {dot && (
                <span className={`h-1.5 w-1.5 rounded-full bg-current opacity-80`} />
            )}
            {children}
        </span>
    );
}
