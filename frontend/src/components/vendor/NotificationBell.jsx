/**
 * NotificationBell — header bell with a count badge and dropdown of
 * the most recent pending orders.
 *
 * - Subscribes to realtime INSERTs on the vendor's `orders` table and
 *   surfaces a hot toast the moment a student places an order.
 * - Keeps a small rolling list of the last 5 pending orders so the
 *   vendor can jump to one without leaving the dashboard.
 *
 * No audio is played by default (autoplay policies + accessibility).
 * The surface is wired so a future `<audio>` ping can be added in one
 * place when product confirms the asset.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import supabase from '../../api/supabaseClient';
import Badge from '../common/Badge';
import { formatNaira, relativeTime } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const MAX_ITEMS = 5;

export default function NotificationBell({ pendingCount = 0, pendingOrders = [] }) {
    const navigate = useNavigate();
    const { vendor } = useAuth();
    const [open, setOpen] = useState(false);
    const [recent, setRecent] = useState([]);
    const wrapRef = useRef(null);

    // Close the dropdown on outside click.
    useEffect(() => {
        function handler(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Keep the dropdown in sync with whatever the parent already knows
    // about pending orders. We don't fetch — the parent owns that.
    useEffect(() => {
        setRecent((prev) => {
            const merged = [...pendingOrders];
            for (const o of prev) {
                if (!merged.find((m) => m.id === o.id)) merged.push(o);
            }
            return merged.slice(0, MAX_ITEMS);
        });
    }, [pendingOrders]);

    // Realtime: surface a toast the moment a new order is inserted.
    useEffect(() => {
        if (!vendor?.id) return undefined;
        const channel = supabase
            .channel(`orders-bell-${vendor.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                    filter: `vendor_id=eq.${vendor.id}`,
                },
                (payload) => {
                    const o = payload.new || {};
                    setRecent((prev) => [{ ...o, _just: true }, ...prev].slice(0, MAX_ITEMS));
                    toast.custom(
                        (t) => (
                            <div
                              className={`max-w-sm rounded-xl bg-white shadow-large border border-gray-100 p-3 flex items-start gap-3 ${t.visible ? 'animate-slide-up' : ''}`}
                            >
                                <div className="h-9 w-9 rounded-lg bg-brand-orange-50 text-brand-orange-500 flex items-center justify-center flex-shrink-0">
                                    <ShoppingBag size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">
                                        New order from {o.student_name || 'a student'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {formatNaira(o.total_price)} · pending your action
                                    </p>
                                </div>
                            </div>
                        ),
                        { duration: 5000, id: `order-${o.id}` }
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [vendor?.id]);

    const onOpenOrder = (id) => {
        setOpen(false);
        navigate('/dashboard');
        // We don't have a single-order view yet — the kanban already lists
        // all pending orders on the orders tab, so navigating there is
        // enough context to find the order by id.
        setTimeout(() => {
            const el = document.querySelector(`[data-order-id="${id}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
    };

    return (
        <div className="relative" ref={wrapRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label={`Notifications · ${pendingCount} pending`}
                className="relative h-10 w-10 inline-flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
            >
                <Bell size={18} />
                {pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-large py-1 animate-slide-up z-40">
                    <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Notifications</p>
                        <Badge tone={pendingCount ? 'orange' : 'success'} dot>
                            {pendingCount ? `${pendingCount} pending` : 'All caught up'}
                        </Badge>
                    </div>

                    {recent.length === 0 ? (
                        <p className="text-sm text-gray-500 px-4 py-6 text-center">
                            Nothing new right now.
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {recent.map((o) => (
                                <li key={o.id}>
                                    <button
                                        onClick={() => onOpenOrder(o.id)}
                                        data-order-id={o.id}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-start gap-3"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-brand-orange-50 text-brand-orange-500 flex items-center justify-center flex-shrink-0">
                                            <ShoppingBag size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {o.student_name || `Order #${o.id}`}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {formatNaira(o.total_price)} · {relativeTime(o.created_at)}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}