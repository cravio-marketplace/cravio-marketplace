export default function Card({
  children,
  className = '',
  padding = 'md',
  title,
  description,
  action,
  as: Tag = 'div',
}) {
  const padCls = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <Tag className={`bg-white rounded-2xl shadow-soft ${className}`}>
      {(title || action) && (
        <div className={`flex items-start justify-between gap-4 ${padding === 'none' ? 'p-6' : padCls} border-b border-gray-100`}>
          <div>
            {title && <h3 className="text-base font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={title || action ? '' : padCls}>{children}</div>
    </Tag>
  );
}
