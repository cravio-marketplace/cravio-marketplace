/**
 * Order column — one of the 4 columns (pending/accepted/ready/completed)
 * on the orders view. Shows count, preview list, and a "View all" link.
 */
import { CheckCircle, Clock, Flame, Package } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import { formatNaira, relativeTime } from '../../utils/formatters';

const COLUMN_DEFS = {
    pending: {
        title: 'Pending',
        icon: Clock,
        tone: 'orange',
        cta: 'Accept',
    },
    accepted: {
        title: 'Accepted',
        icon: Flame,
        tone: 'blue',
        cta: 'Mark ready',
    },
    ready: {
        title: 'Ready',
        icon: CheckCircle,
        tone: 'green',
        cta: 'Complete',
    },
    completed: {
        title: 'Completed',
        icon: Package,
        tone: 'gray',
        cta: null,
    },
};

export default function OrderColumn({ status, orders, onAction, onViewAll }) {
    const def = COLUMN_DEFS[status];
    const Icon = def.icon;
    const visible = orders.slice(0, 3);

    return (
        <Card className="p-4 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-brand-orange-50 text-brand-orange-500 flex items-center justify-center">
                        <Icon size={16} />
                    </div>
                    <h3 className="font-semibold text-gray-900">{def.title}</h3>
                    <Badge tone={def.tone}>{orders.length}</Badge>
                </div>
                {orders.length > visible.length && (
                    <button
                        onClick={onViewAll}
                        className="text-xs font-medium text-brand-orange-500 hover:underline"
                    >
                        View all
                    </button>
                )}
            </div>

            {orders.length === 0 ? (
                <EmptyState variant="orders" />
            ) : (
                <ul className="space-y-2 flex-1">
                    {visible.map((order, idx) => (
                        <li
                            key={order.id}
                            className={`rounded-xl border border-gray-100 p-3 transition hover:shadow-soft ${
                                status === 'pending' ? 'animate-slide-up' : ''
                            }`}
                            style={{ animationDelay: `${idx * 60}ms` }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {order.student_name || `Order #${order.id}`}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {relativeTime(order.created_at)} · {formatNaira(order.total_price)}
                                    </p>
                                </div>
                                {def.cta && (
                                    <button
                                        onClick={() => onAction(order)}
                                        className="text-xs font-medium rounded-lg px-3 py-1.5 bg-brand-orange-500 text-white hover:bg-brand-orange-600"
                                    >
                                        {def.cta}
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
