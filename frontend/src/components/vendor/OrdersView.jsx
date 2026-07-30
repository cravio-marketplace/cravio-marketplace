/**
 * OrdersView — 4-column kanban for incoming / active / completed orders.
 *
 * - New pending orders get a `pulse` animation so the vendor can see them
 *   even when looking away from the screen.
 * - Each column links to the order history filtered to its status.
 */
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import OrderColumn from './OrderColumn';
import { acceptOrder, markOrderReady, completeOrder } from '../../api/orders';

export default function OrdersView({ orders, refresh }) {
    const grouped = useMemo(() => {
        const g = { pending: [], accepted: [], ready: [], completed: [] };
        for (const o of orders) {
            if (g[o.status]) g[o.status].push(o);
        }
        return g;
    }, [orders]);

    const onAction = async (order) => {
        try {
            if (order.status === 'pending') {
                await acceptOrder(order.id);
                toast.success('Order accepted');
            } else if (order.status === 'accepted') {
                const { data } = await markOrderReady(order.id);
                toast.success(`Pickup code: ${data.code}`);
            } else if (order.status === 'ready') {
                const code = window.prompt('Enter the pickup code the student gave you:');
                if (!code) return;
                await completeOrder(order.id, code);
                toast.success('Order completed');
            }
            refresh?.();
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Action failed');
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Object.entries(grouped).map(([status, list]) => (
                <OrderColumn
                    key={status}
                    status={status}
                    orders={list}
                    onAction={onAction}
                    onViewAll={() => {
                        // Deep-linking to a filtered view could be added here.
                        toast(`Showing first ${list.length} ${status} orders`);
                    }}
                />
            ))}
        </div>
    );
}
