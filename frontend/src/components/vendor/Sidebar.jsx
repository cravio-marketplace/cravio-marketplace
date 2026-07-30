/**
 * Dashboard sidebar.
 *
 * On desktop it's a fixed left rail; on mobile/tablet it collapses to a
 * bottom navigation strip so the dashboard stays usable on phones.
 */
import {
    ShoppingBag,
    Menu as MenuIcon,
    BarChart3,
    Tag,
    Star,
    Headphones,
    Settings,
    User,
} from 'lucide-react';

const items = [
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'menu', label: 'Menu', icon: MenuIcon },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'featured', label: 'Featured', icon: Star },
    { id: 'support', label: 'Support', icon: Headphones },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeView, setActiveView }) {
    return (
        <>
            {/* Desktop rail */}
            <aside className="hidden md:flex w-64 flex-col border-r border-gray-100 bg-white">
                <div className="px-6 py-5 border-b border-gray-100">
                    <p className="text-xl font-bold text-brand-orange">Cravio</p>
                    <p className="text-xs text-gray-400 mt-0.5">Vendor dashboard</p>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const active = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                                    active
                                        ? 'bg-brand-orange-50 text-brand-orange'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Icon size={18} />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="px-4 py-4 border-t border-gray-100 text-xs text-gray-400">
                    Cravio v2.0 · 2026
                </div>
            </aside>

            {/* Mobile bottom nav (first 5 items) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-large">
                <div className="grid grid-cols-5">
                    {items.slice(0, 5).map((item) => {
                        const Icon = item.icon;
                        const active = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                                    active ? 'text-brand-orange' : 'text-gray-500'
                                }`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
