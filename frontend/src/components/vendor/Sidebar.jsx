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

const MENU_GROUPS = [
    {
        label: 'MAIN',
        items: [
            { id: 'orders', label: 'Orders', icon: ShoppingBag },
            { id: 'menu', label: 'Menu', icon: MenuIcon },
        ],
    },
    {
        label: 'MANAGE',
        items: [
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'featured', label: 'Featured', icon: Star },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ],
    },
    {
        label: 'ACCOUNT',
        items: [
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'settings', label: 'Settings', icon: Settings },
        ],
    },
    {
        label: 'HELP',
        items: [
            { id: 'support', label: 'Support', icon: Headphones },
        ],
    },
];

export default function Sidebar({ activeView, setActiveView }) {
    return (
        <>
            {/* Desktop rail */}
            <aside className="hidden md:flex w-64 flex-col border-r border-gray-100 bg-white">
                <div className="px-6 py-5 border-b border-gray-100">
                    <p className="text-xl font-bold text-brand-orange-500">Cravio</p>
                    <p className="text-xs text-gray-400 mt-0.5">Vendor dashboard</p>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
                    {MENU_GROUPS.map((group) => (
                        <div key={group.label} className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                {group.label}
                            </p>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                const active = activeView === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveView(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                                            active
                                                ? 'bg-brand-orange-50 text-brand-orange-600'
                                                : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Icon size={18} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>
                <div className="px-4 py-4 border-t border-gray-100 text-xs text-gray-400">
                    Cravio v2.0 · 2026
                </div>
            </aside>

            {/* Mobile bottom nav (first 5 items) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-large">
                <div className="grid grid-cols-5">
                    {MENU_GROUPS.flatMap(g => g.items).slice(0, 5).map((item) => {
                        const Icon = item.icon;
                        const active = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`flex flex-col items-center gap-0.5 py-3 text-xs font-medium ${
                                    active ? 'text-brand-orange-500' : 'text-gray-500'
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
