// Generic confirm dialog. Use:
//   const [target, setTarget] = useState(null);
//   <ConfirmDialog open={!!target} title="Delete item?" onCancel={() => setTarget(null)} onConfirm={async () => { ... }} />
import { useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-large w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onCancel} className="p-1 -m-1 text-gray-400 hover:text-gray-600 rounded">
            <X size={18} />
          </button>
        </div>
        {description && (
          <div className="px-5 py-4 text-sm text-gray-600">
            {description}
          </div>
        )}
        <div className="flex gap-2 p-5 border-t border-gray-100">
          <Button variant="ghost" onClick={onCancel} disabled={loading} className="flex-1">
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={handleConfirm} loading={loading} className="flex-1">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
