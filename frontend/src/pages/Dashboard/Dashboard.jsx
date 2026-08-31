/**
 * Dashboard — top-level vendor screen.
 *
 * Composes the sidebar, header, and active view. Fetches aggregated stats
 * once and lets the realtime subscription on orders keep the UI live.
 *
 * Orders view layout:
 *   1. Low-stock banner — only shown if any item is at or below its threshold
 *   2. Stat cards (revenue / total / pending / active)
 *   3. 4-column kanban (new / accepted / ready / completed)
 *   4. Order history table with date + status filters + CSV export
 *
 * Loading: shows LoadingState while the first paint is in flight.
 * Error:   shows ErrorState with retry if the initial fetch fails.
 */
import { useCallback, useEffect, useMemo, useState, memo } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import Sidebar from '../../components/vendor/Sidebar';
import Header from '../../components/vendor/Header';
import StatsCards from '../../components/vendor/StatsCards';
import OrdersView from '../../components/vendor/OrdersView';
import OrderHistory from '../../components/vendor/OrderHistory';
import MenuGrid from '../../components/vendor/MenuGrid';
import EditItemModal from '../../components/vendor/EditItemModal';
import BulkUploadModal from '../BulkUploadModal';
import { useOrders } from '../../hooks/useOrders';
import { useMenu } from '../../hooks/useMenu';
import { useAuth } from '../../contexts/AuthContext';
import { fetchDashboard } from '../../api/vendor';
import { createItem, updateItem, deleteItem } from '../../api/menu';
import AnalyticsView from '../AnalyticsView';
import CategoriesView from '../CategoriesView';
import FeaturedView from '../FeaturedView';
import SupportView from '../SupportView';
import SettingsView from '../SettingsView';
import ProfileView from '../ProfileView';
import LoadingState from '../../components/ui/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';

export default function Dashboard() {
    const { vendor, updateVendor } = useAuth();
    const [activeView, setActiveView] = useState('orders');
    const [editingItem, setEditingItem] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [stats, setStats] = useState(null);
    const [lowStock, setLowStock] = useState([]);
    const [statsError, setStatsError] = useState(false);

    const {
        orders,
        refresh: refreshOrders,
        loading: ordersLoading,
        error: ordersError,
    } = useOrders(vendor?.id);
    const { menu, refresh: refreshMenu, remove, setAvailability, restock } = useMenu();

    const loadDashboard = useCallback(async () => {
        if (!vendor?.id) return;
        try {
            const res = await fetchDashboard();
            setStats(res.data.stats);
            setLowStock(res.data.low_stock || []);
            setStatsError(false);
        } catch {
            setStatsError(true);
        }
    }, [vendor?.id]);

    // Only re-fetch stats when the *pending* count changes. Every realtime
    // INSERT fires the previous effect, which was a full dashboard refetch
    // on every keystroke. The pending count is what the dashboard UI cares
    // about; completed orders don't change today's revenue in a way that
    // needs a second network round-trip for this view.
    const pendingCount = useMemo(
        () => orders.filter((o) => o.status === 'pending').length,
        [orders]
    );

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vendor?.id, pendingCount]);

    useEffect(() => {
        const handler = (e) => e.detail && setActiveView(e.detail);
        window.addEventListener('cravio:navigate', handler);
        return () => window.removeEventListener('cravio:navigate', handler);
    }, []);

    const handleSaveItem = useCallback(
        async (item, payload) => {
            try {
                if (item) {
                    await updateItem(item.id, payload);
                    toast.success('Item updated');
                } else {
                    await createItem(payload);
                    toast.success('Item added');
                }
                await refreshMenu();
                await loadDashboard();
            } catch (e) {
                toast.error(e?.response?.data?.error || 'Save failed');
                throw e;
            }
        },
        [refreshMenu, loadDashboard]
    );

    const handleDelete = useCallback(
        async (item) => {
            if (!window.confirm(`Delete "${item.name}"?`)) return;
            try {
                await deleteItem(item.id);
                await remove(item.id);
                toast.success('Item deleted');
                await loadDashboard();
            } catch (err) {
                toast.error(err?.response?.data?.error || 'Delete failed');
            }
        },
        [remove, loadDashboard]
    );

    const handleToggleAvailability = useCallback(
        async (item) => {
            try {
                await setAvailability(item.id, !item.available);
                toast.success(
                    item.available ? 'Hidden from students' : 'Available to students'
                );
                await loadDashboard();
            } catch (err) {
                toast.error(err?.response?.data?.error || 'Update failed');
            }
        },
        [setAvailability, loadDashboard]
    );

    const handleRestock = useCallback(
        async (item, qty) => {
            try {
                await restock(item.id, qty);
                toast.success(`Added ${qty} to stock`);
                await loadDashboard();
            } catch (err) {
                toast.error(err?.response?.data?.error || 'Restock failed');
            }
        },
        [restock, loadDashboard]
    );

    if (!vendor) {
        return <LoadingState mode="block" label="Loading your account…" />;
    }

    return (
        <div className="flex h-screen bg-[#F8F9FB]">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
                <Header vendor={vendor} stats={stats} pendingOrders={orders} />
                <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
                    {activeView === 'orders' && (
                        <OrdersScreen
                            orders={orders}
                            stats={stats}
                            statsError={statsError}
                            onRetryStats={loadDashboard}
                            ordersError={ordersError}
                            refreshOrders={refreshOrders}
                            ordersLoading={ordersLoading}
                            lowStock={lowStock}
                            onAddItem={() => {
                                setActiveView('menu');
                                setShowAddItem(true);
                            }}
                        />
                    )}
                    {activeView === 'menu' && (
                        <MenuGrid
                            menu={menu}
                            categories={[]}
                            onAdd={() => setShowAddItem(true)}
                            onEdit={setEditingItem}
                            onDelete={handleDelete}
                            onToggleAvailability={handleToggleAvailability}
                            onRestock={async (item, qty) => handleRestock(item, qty)}
                            onBulkUpload={() => setShowBulk(true)}
                        />
                    )}
                    {activeView === 'analytics' && <AnalyticsView orders={orders} menu={menu} />}
                    {activeView === 'categories' && <CategoriesView />}
                    {activeView === 'featured' && <FeaturedView menu={menu} />}
                    {activeView === 'support' && <SupportView vendor={vendor} />}
                    {activeView === 'settings' && (
                        <SettingsView vendor={vendor} setVendor={updateVendor} />
                    )}
                    {activeView === 'profile' && (
                        <ProfileView vendor={vendor} setVendor={updateVendor} />
                    )}
                </main>
            </div>

            {(showAddItem || editingItem) && (
                <EditItemModal
                    item={editingItem}
                    onClose={() => {
                        setShowAddItem(false);
                        setEditingItem(null);
                    }}
                    onSave={(payload) => handleSaveItem(editingItem, payload)}
                />
            )}
            {showBulk && (
                <BulkUploadModal
                    onClose={() => setShowBulk(false)}
                    onComplete={refreshMenu}
                />
            )}
        </div>
    );
}

/**
 * OrdersScreen — content of the orders tab. Pulled out to keep the
 * Dashboard shell compact. Renders low-stock banner, stats, kanban, and
 * history; each region has its own loading / error state.
 */
const OrdersScreen = memo(function OrdersScreen({
    orders,
    stats,
    statsError,
    onRetryStats,
    ordersError,
    refreshOrders,
    ordersLoading,
    lowStock,
    onAddItem,
}) {
    return (
        <>
            <QuickActions
                pendingCount={orders.filter((o) => o.status === 'pending').length}
                lowStockCount={lowStock.length}
                onAddItem={onAddItem}
            />

            {lowStock.length > 0 && (
                <Card className="p-4 bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-amber-900">
                                {lowStock.length} item{lowStock.length === 1 ? '' : 's'} low on stock
                            </p>
                            <p className="text-sm text-amber-800 mt-0.5">
                                Restock soon to avoid selling out:{' '}
                                {lowStock.slice(0, 3).map((i) => i.name).join(', ')}
                                {lowStock.length > 3
                                    ? ` and ${lowStock.length - 3} more`
                                    : ''}
                                .
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {statsError ? (
                <ErrorState
                    title="Couldn't load your stats"
                    description="We had trouble pulling today's numbers. Your orders are still safe."
                    onRetry={onRetryStats}
                />
            ) : (
                <StatsCards stats={stats} />
            )}

            {ordersError ? (
                <Card className="p-6">
                    <ErrorState
                        title="Couldn't load orders"
                        description="Check your connection and try again."
                        onRetry={refreshOrders}
                    />
                </Card>
            ) : (
                <OrdersView
                    orders={orders}
                    refresh={refreshOrders}
                    loading={ordersLoading}
                />
            )}

            <OrderHistory />
        </>
    );
});

/**
 * QuickActions — small row above the kanban with the two shortcuts the
 * vendor is most likely to take from the orders screen: jump to pending
 * orders (filtered history) and add a new menu item.
 *
 * The pending tile links to the same kanban's pending column, so it
 * mostly serves as an at-a-glance reminder rather than navigation.
 */
function QuickActions({ pendingCount, lowStockCount, onAddItem }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500">Pending orders</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-0.5">{pendingCount}</p>
                </div>
                <Badge tone={pendingCount ? 'orange' : 'gray'} dot>
                    {pendingCount ? 'Needs attention' : 'All clear'}
                </Badge>
            </Card>
            <Card className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-500">Low-stock items</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-0.5">{lowStockCount}</p>
                </div>
                <Badge tone={lowStockCount ? 'red' : 'success'} dot>
                    {lowStockCount ? 'Restock soon' : 'Stocked up'}
                </Badge>
            </Card>
            <Card className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                    <p className="text-xs text-gray-500">Quick add</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">New menu item</p>
                </div>
                <Button onClick={onAddItem}>Add</Button>
            </Card>
        </div>
    );
}