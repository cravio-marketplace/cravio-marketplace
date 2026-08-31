import { Loader2 } from 'lucide-react';
import { Skeleton, SkeletonCard, SkeletonText } from './Skeleton';

/**
 * LoadingState — three modes for the three places we typically load:
 *
 * 1. Inline (default): a centred spinner with optional label.
 *    Use inside a card or page that has nothing else to show.
 *
 * 2. `block`: takes the full available height, ideal for the dashboard
 *    main pane during the first paint.
 *
 * 3. `skeleton`: renders SkeletonText (lines) or SkeletonCard — use this
 *    when the final layout is known but data isn't.
 */
export default function LoadingState({
  label = 'Loading…',
  mode = 'inline',
  skeleton = 'text', // 'text' | 'card'
  lines = 3,
  className = '',
}) {
  if (mode === 'skeleton') {
    return (
      <div className={className}>
        {skeleton === 'card' ? <SkeletonCard /> : <SkeletonText lines={lines} />}
      </div>
    );
  }

  const wrapCls =
    mode === 'block'
      ? `flex flex-col items-center justify-center min-h-[300px] text-gray-400 ${className}`
      : `flex flex-col items-center justify-center py-12 text-gray-400 ${className}`;

  return (
    <div className={wrapCls}>
      <Loader2 size={20} className="animate-spin" />
      {label && <p className="text-xs mt-2 font-medium">{label}</p>}
    </div>
  );
}