export default function Select({
  label,
  hint,
  error,
  children,
  className = '',
  id,
  ...rest
}) {
  const reactId = useIdFallback(id);
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={reactId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={reactId}
        className={`w-full h-10 rounded-xl border bg-white px-3 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange-200 focus:border-brand-orange-400 disabled:bg-gray-50 ${
          error ? 'border-red-300' : 'border-gray-200'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

let _idCounter = 0;
function useIdFallback(id) {
  if (id) return id;
  return `select-${++_idCounter}`;
}
