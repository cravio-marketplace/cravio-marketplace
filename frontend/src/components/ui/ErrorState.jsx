import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * ErrorState — a friendly retry surface for failed loads.
 *
 * Use this anywhere a fetch can fail at the top level (dashboard stats,
 * menu list, support tickets). It replaces the bare "Failed to load X"
 * toast with something the user can act on without leaving the screen.
 *
 * @param {object} props
 * @param {string} props.title       Headline. Defaults to "Something went wrong".
 * @param {string} props.description Why it failed, in plain English.
 * @param {() => void} props.onRetry Retry callback.
 */
export default function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn\'t load this. Check your connection and try again.',
  onRetry,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
        <AlertTriangle size={28} strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw size={14} /> Try again
          </Button>
        </div>
      )}
    </div>
  );
}