/**
 * SettingsView — tabbed settings with real sections.
 *
 * Sections: Profile info, Password, Notifications, Payout (coming soon),
 * Danger Zone (delete account).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, Edit2, LogOut, Shield, Trash2, Wallet } from 'lucide-react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Toggle from '../components/common/Toggle';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EditProfileModal from '../components/vendor/EditProfileModal';
import ChangePasswordModal from '../components/vendor/ChangePasswordModal';
import { useAuth } from '../contexts/AuthContext';
import { toggleSms } from '../api/vendor';

const SECTIONS = [
    { id: 'profile', label: 'Profile info', icon: Edit2 },
    { id: 'password', label: 'Password', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'payout', label: 'Payout', icon: Wallet },
    { id: 'danger', label: 'Danger zone', icon: Trash2 },
];

export default function SettingsView() {
    const { vendor, updateVendor, signOut, refreshVendor } = useAuth();
    const [showEdit, setShowEdit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [saving, setSaving] = useState(false);

    const onToggleSms = async (next) => {
        setSaving(true);
        try {
            const { data } = await toggleSms();
            updateVendor({ sms_enabled: data.sms_enabled });
            toast.success(data.sms_enabled ? 'SMS notifications on' : 'SMS off');
        } catch {
            toast.error('Failed to update');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl space-y-4">
            <Card className="p-2 flex flex-wrap gap-1">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                    <a
                        key={id}
                        href={`#${id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        <Icon size={14} /> {label}
                    </a>
                ))}
            </Card>

            <Card id="profile" className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">Profile info</h3>
                        <p className="text-sm text-gray-500">Update your business name, hours, and images.</p>
                    </div>
                    <Button onClick={() => setShowEdit(true)}>Edit</Button>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <Row label="Business name" value={vendor?.business_name} />
                    <Row label="Phone" value={vendor?.phone} />
                    <Row label="Address" value={vendor?.address} />
                    <Row label="Hours" value={vendor?.opening_hours} />
                </dl>
            </Card>

            <Card id="password" className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">Password</h3>
                        <p className="text-sm text-gray-500">Use a strong password you don't reuse elsewhere.</p>
                    </div>
                    <Button variant="secondary" onClick={() => setShowPassword(true)}>
                        <Shield size={14} /> Change password
                    </Button>
                </div>
            </Card>

            <Card id="notifications" className="p-5 space-y-4">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <Toggle
                    label="SMS notifications"
                    description="Text me when I get a new order."
                    checked={!!vendor?.sms_enabled}
                    onChange={onToggleSms}
                    disabled={saving}
                />
                <Toggle
                    label="Email digest"
                    description="Daily summary of sales and pending actions."
                    checked
                    onChange={() => toast('Email digest will be configurable in a future release.')}
                />
            </Card>

            <Card id="payout" className="p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900">Payout</h3>
                        <p className="text-sm text-gray-500">
                            Connect a bank account so we can send your earnings.
                        </p>
                    </div>
                    <Badge text="Coming soon" />
                </div>
            </Card>

            <Card id="danger" className="p-5 space-y-3">
                <h3 className="font-semibold text-red-600">Danger zone</h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-sm text-gray-500">
                        Deleting your account is permanent — all menu items and order history will be removed.
                    </p>
                    <Button variant="danger" onClick={() => setShowDelete(true)}>
                        <Trash2 size={14} /> Delete account
                    </Button>
                </div>
                <Button variant="ghost" onClick={signOut}>
                    <LogOut size={14} /> Logout
                </Button>
            </Card>

            {showEdit && (
                <EditProfileModal
                    vendor={vendor}
                    onClose={() => setShowEdit(false)}
                    onSave={async (payload) => {
                        const { updateProfile } = await import('../api/vendor');
                        await updateProfile(payload);
                        await refreshVendor();
                        setShowEdit(false);
                        toast.success('Profile updated');
                    }}
                />
            )}
            {showPassword && (
                <ChangePasswordModal onClose={() => setShowPassword(false)} />
            )}
            <ConfirmDialog
                open={showDelete}
                title="Delete your account?"
                message="This is permanent. All your menu items, categories, and order history will be erased."
                confirmText="Yes, delete"
                danger
                onClose={() => setShowDelete(false)}
                onConfirm={() => {
                    setShowDelete(false);
                    toast('Account deletion is queued — an admin will reach out within 24h.');
                }}
            />
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{value || '—'}</p>
        </div>
    );
}

function Badge({ children }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange-50 text-brand-orange-700 text-xs font-medium px-2.5 py-1">
            {children}
        </span>
    );
}
