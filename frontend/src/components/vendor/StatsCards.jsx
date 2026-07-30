/**
 * Dashboard hero stats row.
 */
import { Package, Clock, Banknote, Flame } from 'lucide-react';
import StatCard from '../common/StatCard';
import { formatNaira } from '../../utils/formatters';

export default function StatsCards({ stats }) {
    if (!stats) return null;
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                label="Today's revenue"
                value={formatNaira(stats.todays_revenue)}
                icon={Banknote}
                accent="green"
            />
            <StatCard label="Total orders" value={stats.total_orders} icon={Package} accent="blue" />
            <StatCard
                label="Pending actions"
                value={stats.pending_actions}
                icon={Clock}
                accent="orange"
            />
            <StatCard label="Active orders" value={stats.active_orders} icon={Flame} accent="red" />
        </div>
    );
}
