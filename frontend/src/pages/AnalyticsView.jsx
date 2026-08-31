/**
 * AnalyticsView — read-only dashboard with quick numbers.
 */
import { Banknote, ShoppingBag, Star, TrendingUp } from 'lucide-react';
import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import { formatNaira, relativeTime } from '../utils/formatters';

export default function AnalyticsView({ orders = [], menu = [] }) {
    const completed = orders.filter((o) => o.status === 'completed');
    const revenue = completed.reduce((sum, o) => sum + (o.total_price || 0), 0);
    const popular = computePopular(completed, menu);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total revenue" value={formatNaira(revenue)} icon={Banknote} accent="green" />
                <StatCard label="Total orders" value={orders.length} icon={ShoppingBag} accent="blue" />
                <StatCard label="Completed" value={completed.length} icon={TrendingUp} accent="orange" />
                <StatCard label="Menu items" value={menu.length} icon={Star} accent="orange" />
            </div>

            <Card className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Recent activity</h3>
                {orders.length === 0 ? (
                    <p className="text-sm text-gray-500">No order activity yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {orders.slice(0, 8).map((o) => (
                            <li
                                key={o.id}
                                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                            >
                                <div className="text-sm">
                                    <p className="font-medium text-gray-800">
                                        {o.student_name || `Order #${o.id}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {relativeTime(o.created_at)} · {o.status}
                                    </p>
                                </div>
                                <p className="font-semibold text-brand-orange-500">
                                    {formatNaira(o.total_price)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}

function computePopular(orders, menu) {
    const counts = new Map();
    for (const o of orders) {
        if (Array.isArray(o.items)) {
            for (const line of o.items) {
                counts.set(line.name, (counts.get(line.name) || 0) + (line.quantity || 1));
            }
        }
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => ({ name, qty }));
}
