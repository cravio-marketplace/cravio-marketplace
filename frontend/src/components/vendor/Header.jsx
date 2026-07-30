/**
 * Dashboard header.
 *
 * Layout: logo + vendor name + status badge (left) | search (centre) |
 * notifications bell + profile menu (right).
 */
import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Search, Settings, Pause, Play } from 'lucide-react';
import Badge from '../common/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { togglePause } from '../../api/vendor';
import toast from 'react-hot-toast';
import { formatNaira } from '../../utils/formatters';

const STATUS_TONE = {
    open: 'green',
    paused: 'orange',
    closed: 'red',
};

function statusLabel(vendor) {
    if (vendor?.status === 'closed') return { label: 'Closed', tone: 'red' };
    if (!vendor?.is_accepting_orders) return { label: 'Paused', tone: 'orange' };
    return { label: 'Accepting orders', tone: 'green' };
}

export default function Header({ vendor, stats, onSearch }) {
    const { signOut } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [search, setSearch] = useState('');
    const status = statusLabel(vendor);

    useEffect(() => {
        function handler(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const onTogglePause = async () => {
        try {
            const { data } = await togglePause();
            vendor.is_accepting_orders = data.is_accepting_orders;
            toast.success(data.is_accepting_orders ? 'Now accepting orders' : 'Paused');
        } catch {
            toast.error('Failed to update status');
        }
    };

    return (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
                {/* Left: brand + vendor + status */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange text-white font-bold">
                        C
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="font-semibold text-gray-900 truncate max-w-[180px] sm:max-w-none">
                                {vendor?.business_name || 'Cravio'}
                            </h1>
                            <Badge tone={status.tone} dot>
                                {status.label}
                            </Badge>
                        </div>
                        {stats && (
                            <p className="hidden sm:block text-xs text-gray-500 mt-0.5">
                                {formatNaira(stats.todays_revenue)} today · {stats.todays_orders} orders
                            </p>
                        )}
                    </div>
                </div>

                {/* Centre: search */}
                <div className="hidden md:block flex-1 max-w-md">
                    <div className="relative">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                onSearch?.(e.target.value);
                            }}
                            placeholder="Search orders, menu items..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2.5 text-sm
                                focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
                        />
                    </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onTogglePause}
                        className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"
                        title={vendor?.is_accepting_orders ? 'Pause orders' : 'Resume orders'}
                    >
                        {vendor?.is_accepting_orders ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button className="relative h-10 w-10 inline-flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100">
                        <Bell size={18} />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-brand-orange" />
                    </button>
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuOpen((v) => !v)}
                            className="flex items-center gap-2 rounded-xl pl-1 pr-2 py-1 hover:bg-gray-100"
                        >
                            <div className="h-9 w-9 rounded-full bg-brand-orange text-white flex items-center justify-center font-semibold">
                                {vendor?.business_name?.charAt(0).toUpperCase() || 'V'}
                            </div>
                            <ChevronDown size={16} className="text-gray-500 hidden sm:block" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white shadow-large py-1 animate-slide-up">
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        window.dispatchEvent(new CustomEvent('cravio:navigate', { detail: 'settings' }));
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <Settings size={16} /> Settings
                                </button>
                                <button
                                    onClick={() => signOut()}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
