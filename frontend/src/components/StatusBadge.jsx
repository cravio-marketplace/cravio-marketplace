import { statusFor } from '../../lib/status';

export default function StatusBadge({ kind, value, size = 'md', withDot = true }) {
  const s = statusFor(kind, value);
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${s.badge} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      {withDot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {s.label}
    </span>
  );
}
