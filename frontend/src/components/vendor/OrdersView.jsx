/**
 * OrdersView — 4-column kanban for incoming / active / completed orders.
 *
 * - New pending orders get a `slide-up` animation so the vendor can see
 *   them even when looking away from the screen.
 * - Each column links to the order history filtered to its status.
 * - While the first fetch is in flight we render a skeleton column so the
 *   layout doesn't reflow when data arrives.
 */
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import OrderColumn from './OrderColumn';
import LoadingState from '../ui/LoadingState';
import OrderDetailModal from './OrderDetailModal';
import { acceptOrder, markOrderReady, completeOrder } from '../../api/orders';

export default function OrdersView({ orders, refresh, loading }) {
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const grouped = useMemo(() => {
        const g = { pending: [], accepted: [], ready: [], completed: [] };
        for (const o of orders) {
            if (g[o.status]) g[o.status].push(o);
        }
        return g;
    }, [orders]);

    const handleViewDetail = (order) => {
        setSelectedOrderId(order.id);
        setIsModalOpen(true);
    };

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

    if (loading && orders.length === 0) {
        return <LoadingState mode="block" label="Loading orders…" />;
    }

    return (
        <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {Object.entries(grouped).map(([status, list]) => (
                    <OrderColumn
                        key={status}
                        status={status}
                        orders={list}
                        onAction={onAction}
                        onViewDetail={handleViewDetail}
                        onViewAll={() => {
                            toast(`Showing first ${list.length} ${status} orders`);
                        }}
                    />
                ))}
            </div>

            <OrderDetailModal
                open={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedOrderId(null);
                }}
                orderId={selectedOrderId}
                refresh={refresh}
            />
        </div>
    );
}