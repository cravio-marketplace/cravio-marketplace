import Button from './Button';

export default function EmptyState({ icon, title, description, action, actionLabel, onAction, className = '' }) {
  const Icon = icon;
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-orange-50 text-brand-orange-500 flex items-center justify-center mb-4">
          <Icon size={28} strokeWidth={1.5} />
        </div>
      )}
      {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>}
      {(action || actionLabel) && (
        <div className="mt-5">
          {action || <Button onClick={onAction}>{actionLabel}</Button>}
        </div>
      )}
    </div>
  );
}
