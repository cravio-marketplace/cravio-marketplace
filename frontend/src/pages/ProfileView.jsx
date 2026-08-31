/**
 * ProfileView — vendor's public-facing restaurant identity.
 *
 * Hero with cover image, overlaid logo + business name, verification
 * badge, and tabbed sections (Info / Menu / Reviews / Orders).
 */
import { useState } from 'react';
import { BadgeCheck, Clock, Edit2, MapPin, Phone } from 'lucide-react';
import { useMenu } from '../hooks/useMenu';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import EditProfileModal from '../components/vendor/EditProfileModal';
import MenuGrid from '../components/vendor/MenuGrid';
import OrderHistory from '../components/vendor/OrderHistory';
import { formatHoursSummary } from '../components/auth/HoursEditor';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../api/vendor';

const TABS = [
    { id: 'info', label: 'Info' },
    { id: 'menu', label: 'Menu' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'orders', label: 'Orders' },
];

export default function ProfileView() {
    const { vendor, refreshVendor } = useAuth();
    const { menu, loading, refresh, remove, setAvailability, restock } = useMenu();
    const [tab, setTab] = useState('info');
    const [editing, setEditing] = useState(false);

    const isVerified = ['open', 'approved'].includes(vendor?.verification_status);

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <Card className="overflow-hidden">
                <div className="relative h-44 sm:h-56 bg-gradient-to-br from-brand-orange-300 to-brand-orange-500">
                    {vendor?.cover_url ? (
                        <img
                            src={vendor.cover_url}
                            alt="Cover"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center text-white/80 text-6xl font-bold">
                            {vendor?.business_name?.charAt(0) || 'R'}
                        </div>
                    )}
                    <button
                        onClick={() => setEditing(true)}
                        className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white shadow text-brand-orange flex items-center justify-center"
                        title="Edit profile"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>
                <div className="px-4 sm:px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="h-24 w-24 rounded-2xl border-4 border-white bg-brand-orange text-white text-3xl font-bold flex items-center justify-center shadow-soft">
                        {vendor?.logo_url ? (
                            <img
                                src={vendor.logo_url}
                                alt="Logo"
                                className="h-full w-full rounded-2xl object-cover"
                            />
                        ) : (
                            vendor?.business_name?.charAt(0).toUpperCase() || 'R'
                        )}
                    </div>
                    <div className="flex-1 sm:pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {vendor?.business_name}
                            </h1>
                            {isVerified && (
                                <Badge tone="green" dot>
                                    <BadgeCheck size={12} /> Verified
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {vendor?.description || 'No description yet — add one in Settings.'}
                        </p>
                    </div>
                </div>
            </Card>

            <div className="flex gap-1 border-b border-gray-100 overflow-x-auto">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                            tab === t.id
                                ? 'border-brand-orange text-brand-orange'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'info' && (
                <Card className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Info icon={Phone} label="Phone" value={vendor?.phone} />
                    <Info icon={MapPin} label="Address" value={vendor?.address || 'Add an address'} />
                    <Info icon={Clock} label="Hours" value={formatHoursSummary(vendor?.opening_hours) || 'Set hours'} />
                    <Info
                        icon={BadgeCheck}
                        label="Status"
                        value={
                            <Badge tone={isVerified ? 'green' : 'yellow'} dot>
                                {vendor?.verification_status}
                            </Badge>
                        }
                    />
                </Card>
            )}

            {tab === 'menu' && (
                <MenuGrid
                    menu={menu}
                    onAdd={() => {}}
                    onEdit={() => {}}
                    onDelete={async (i) => {
                        if (!window.confirm(`Delete ${i.name}?`)) return;
                        await remove(i.id);
                    }}
                    onToggleAvailability={(i) => setAvailability(i.id, !i.available)}
                    onRestock={(id, q) => restock(id, q)}
                />
            )}

            {tab === 'reviews' && (
                <Card className="p-8 text-center text-sm text-gray-500">
                    Reviews will appear here once students start leaving feedback.
                </Card>
            )}

            {tab === 'orders' && <OrderHistory />}
            {editing && (
                <EditProfileModal
                    vendor={vendor}
                    onClose={() => setEditing(false)}
                    onSave={async (payload) => {
                        await updateProfile(payload);
                        await refreshVendor();
                        setEditing(false);
                    }}
                />
            )}
        </div>
    );
}

function Info({ icon: Icon, label, value }) {
    return (
        <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
            <div className="h-9 w-9 rounded-lg bg-white text-brand-orange flex items-center justify-center">
                <Icon size={16} />
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{value || '—'}</div>
            </div>
        </div>
    );
}
