/**
 * Dashboard — top-level vendor screen.
 *
 * Composes the sidebar, header, and active view. Fetches aggregated stats
 * once and lets the realtime subscription on orders keep the UI live.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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

export default function Dashboard() {
    const { vendor, updateVendor } = useAuth();
    const [activeView, setActiveView] = useState('orders');
    const [editingItem, setEditingItem] = useState(null);
    const [showAddItem, setShowAddItem] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [stats, setStats] = useState(null);

    const { orders, refresh: refreshOrders } = useOrders(vendor?.id);
    const { menu, refresh: refreshMenu, remove: removeItem, setAvailability, restock: doRestock } = useMenu();

    useEffect(() => {
        if (!vendor?.id) return;
        fetchDashboard()
            .then((res) => setStats(res.data.stats))
            .catch(() => {});
    }, [vendor?.id, orders.length]);

    // Listen for header-profile-menu navigation events.
    useEffect(() => {
        const handler = (e) => e.detail && setActiveView(e.detail);
        window.addEventListener('cravio:navigate', handler);
        return () => window.removeEventListener('cravio:navigate', handler);
    }, []);

    const handleSaveItem = async (item, payload) => {
        try {
            if (item) {
                await updateItem(item.id, payload);
                toast.success('Item updated');
            } else {
                await createItem(payload);
                toast.success('Item added');
            }
            await refreshMenu();
        } catch (e) {
            toast.error(e?.response?.data?.error || 'Save failed');
            throw e;
        }
    };

    const handleDelete = async (item) => {
        if (!window.confirm(`Delete "${item.name}"?`)) return;
        await removeItem(item.id);
        toast.success('Item deleted');
    };

    const handleToggleAvailability = async (item) => {
        await setAvailability(item.id, !item.available);
        toast.success(item.available ? 'Hidden from students' : 'Available to students');
    };

    const handleRestock = async (id, qty) => {
        await doRestock(id, qty);
        toast.success(`Added ${qty} to stock`);
    };

    return (
        <div className="flex h-screen bg-[#F8F9FB]">
            <Sidebar activeView={activeView} setActiveView={setActiveView} />
            <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
                <Header vendor={vendor} stats={stats} />
                <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
                    {activeView === 'orders' && (
                        <>
                            <StatsCards stats={stats} />
                            <OrdersView orders={orders} refresh={refreshOrders} />
                            <OrderHistory />
                        </>
                    )}
                    {activeView === 'menu' && (
                        <MenuGrid
                            menu={menu}
                            onAdd={() => setShowAddItem(true)}
                            onEdit={setEditingItem}
                            onDelete={handleDelete}
                            onToggleAvailability={handleToggleAvailability}
                            onRestock={handleRestock}
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
