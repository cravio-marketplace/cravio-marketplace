/**
 * OrderHistory — paginated list of completed orders with date filters and
 * CSV export. Lives under the orders view as a "view all" deep-dive.
 */
import { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchOrders } from '../../api/orders';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';
import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import { formatNaira, formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'ready', label: 'Ready' },
    { value: 'completed', label: 'Completed' },
];

const TONES = {
    pending: 'orange',
    accepted: 'blue',
    ready: 'green',
    completed: 'gray',
};

export default function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [status, setStatus] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const params = {};
            if (from) params.from = new Date(from).toISOString();
            if (to) params.to = new Date(to).toISOString();
            if (status) params.status = status;
            const { data } = await fetchOrders(params);
            setOrders(data.orders || []);
        } catch (e) {
            toast.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    const exportCsv = () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');
        const url = `${base}/orders/export.csv`;
        // Open in a new tab — browser will attach the header only if we use
        // fetch + blob, so we use a server-friendly trick: hit the API with
        // the bearer token via a hidden link.
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.blob())
            .then((blob) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `orders-${Date.now()}.csv`;
                a.click();
            })
            .catch(() => toast.error('Export failed'));
    };

    return (
        <div className="space-y-4">
            <Card className="p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <Input
                        label="From"
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-40"
                    />
                    <Input
                        label="To"
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-40"
                    />
                    <div className="w-40">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button variant="secondary" onClick={load} loading={loading}>
                        <Filter size={14} /> Apply
                    </Button>
                    <Button variant="soft" onClick={exportCsv}>
                        <Download size={14} /> Export CSV
                    </Button>
                </div>
            </Card>

            {orders.length === 0 ? (
                <Card className="p-6">
                    <EmptyState
                        variant="search"
                        action="Apply filters"
                        onAction={load}
                    />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="text-left px-4 py-3">Order</th>
                                <th className="text-left px-4 py-3">Student</th>
                                <th className="text-left px-4 py-3">Total</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-left px-4 py-3">When</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.map((o) => (
                                <tr key={o.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">#{o.id}</td>
                                    <td className="px-4 py-3 text-gray-700">{o.student_name || '—'}</td>
                                    <td className="px-4 py-3 font-semibold text-brand-orange-500">
                                        {formatNaira(o.total_price)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge tone={TONES[o.status] || 'gray'} dot>
                                            {o.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{formatDate(o.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
