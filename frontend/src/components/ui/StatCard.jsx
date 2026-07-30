import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, trend, accent = 'neutral', className = '' }) {
  const accentCls = {
    neutral: 'bg-gray-100 text-gray-700',
    brand: 'bg-brand-orange-50 text-brand-orange-600',
  }[accent];

  return (
    <div className={`bg-white rounded-2xl shadow-soft p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1 truncate">{value}</p>
          {trend && <TrendIndicator {...trend} />}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accentCls}`}>
            <Icon size={20} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  );
}

function TrendIndicator({ value, direction = 'flat' }) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const color = direction === 'up' ? 'text-emerald-600' : direction === 'down' ? 'text-red-600' : 'text-gray-500';
  return (
    <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${color}`}>
      <Icon size={14} />
      <span>{value}</span>
    </div>
  );
}
