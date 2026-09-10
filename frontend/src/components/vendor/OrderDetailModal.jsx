import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, User, CreditCard, Package, CheckCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { getOrder, acceptOrder, markOrderReady, completeOrder } from '../../api/orders';
import { formatNaira, relativeTime } from '../../utils/formatters';

export default function OrderDetailModal({ open, onClose, orderId, refresh }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!orderId || !open) return;

        const fetchDetails = async () => {
            setLoading(true);
            try {
                const { data } = await getOrder(orderId);
                setOrder(data.order);
            } catch (err) {
                toast.error(err?.response?.data?.error || 'Could not load order details');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [orderId, open]);

    const handleAction = async () => {
        if (!order) return;
        setActionLoading(true);
        try {
            if (order.status === 'pending') {
                await acceptOrder(order.id);
                toast.success('Order accepted');
            } else if (order.status === 'accepted') {
                const { data } = await markOrderReady(order.id);
                toast.success(`Order ready! Pickup code: ${data.code}`);
            } else if (order.status === 'ready') {
                const code = window.prompt('Enter the student\'s pickup code:');
                if (!code) return;
                await completeOrder(order.id, code);
                toast.success('Order completed');
            }
            await refresh?.();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { label: 'Pending', color: 'bg-orange-100 text-orange-600' },
            accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-600' },
            ready: { label: 'Ready', color: 'bg-green-100 text-green-600' },
            completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600' },
        };
        return badges[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
    };

    if (!open) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Order #${orderId}`}
            size="lg"
            footer={
                order && order.status !== 'completed' && (
                    <Button onClick={handleAction} loading={actionLoading}>
                        {order.status === 'pending' ? 'Accept Order' :
                         order.status === 'accepted' ? 'Mark as Ready' :
                         'Complete Order'}
                    </Button>
                )
            }
        >
            {loading ? (
                <div className="py-10 text-center text-gray-500">Loading order details...</div>
            ) : order ? (
                <div className="space-y-8">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <User size={20} className="text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Customer</p>
                                <p className="text-sm font-semibold text-gray-900">{order.student_name || 'Unknown Student'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <CreditCard size={20} className="text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Payment</p>
                                <p className="text-sm font-semibold text-gray-900">{order.payment_method || 'Not specified'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status & Time */}
                    <div className="flex items-center justify-between py-2 border-y border-gray-100">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-600">
                                Placed {relativeTime(order.created_at)}
                            </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(order.status).color}`}>
                            {getStatusBadge(order.status).label}
                        </span>
                    </div>

                    {/* Items List */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-gray-900">
                            <Package size={18} />
                            <h3 className="font-semibold">Ordered Items</h3>
                        </div>
                        <div className="border border-gray-100 rounded-2xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Item</th>
                                        <th className="px-4 py-3 font-medium text-center">Qty</th>
                                        <th className="px-4 py-3 font-medium text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items?.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-800">{item.name}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-gray-800">{formatNaira(item.price)}</td>
                                        </tr>
                                    )) || (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-8 text-center text-gray-400">No items found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-orange-50 border border-brand-orange-100">
                        <span className="font-semibold text-brand-orange-900">Total Amount</span>
                        <span className="text-xl font-bold text-brand-orange-600">{formatNaira(order.total_price)}</span>
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center text-gray-500">Order not found</div>
            )}
        </Modal>
    );
}
