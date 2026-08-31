/**
 * EditProfileModal — edit business info, hours, logo, cover.
 *
 * Hours use the shared `HoursEditor` so the value stays in the
 * same structured shape everywhere (CSV on the wire, structured in
 * state). Logo and cover upload go through `api/uploads.uploadVendorAsset`
 * which talks to the `menu-images` bucket under the vendor's own folder
 * — the storage RLS policies reject uploads anywhere else.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, X } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Button from '../common/Button';
import HoursEditor, { hoursToPayload, parseHoursPayload } from '../auth/HoursEditor';
import { uploadVendorAsset } from '../../api/uploads';

export default function EditProfileModal({ vendor, onClose, onSave }) {
    const [form, setForm] = useState({
        business_name: vendor?.business_name || '',
        phone: vendor?.phone || '',
        description: vendor?.description || '',
        address: vendor?.address || '',
        opening_hours_struct: parseHoursPayload(vendor?.opening_hours) || {},
        logo_url: vendor?.logo_url || '',
        cover_url: vendor?.cover_url || '',
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState({ logo: false, cover: false });

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const upload = async (file, kind) => {
        if (!file || !vendor?.id) return;
        setUploading((u) => ({ ...u, [kind]: true }));
        try {
            const { url } = await uploadVendorAsset(kind, file, vendor.id);
            set({ [`${kind}_url`]: url });
            toast.success(`${kind === 'logo' ? 'Logo' : 'Cover'} uploaded`);
        } catch (e) {
            toast.error(e.message || 'Upload failed');
        } finally {
            setUploading((u) => ({ ...u, [kind]: false }));
        }
    };

    const clearAsset = (kind) => set({ [`${kind}_url`]: '' });

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                business_name: form.business_name,
                phone: form.phone,
                description: form.description,
                address: form.address,
                opening_hours: hoursToPayload(form.opening_hours_struct),
                logo_url: form.logo_url || null,
                cover_url: form.cover_url || null,
            };
            await onSave(payload);
        } catch (err) {
            toast.error(err?.response?.data?.error || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Edit profile"
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={submit} loading={saving}>
                        Save changes
                    </Button>
                </>
            }
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AssetField
                        kind="cover"
                        label="Cover image"
                        url={form.cover_url}
                        uploading={uploading.cover}
                        onUpload={(file) => upload(file, 'cover')}
                        onClear={() => clearAsset('cover')}
                        aspect="aspect-[3/1]"
                    />
                    <AssetField
                        kind="logo"
                        label="Logo"
                        url={form.logo_url}
                        uploading={uploading.logo}
                        onUpload={(file) => upload(file, 'logo')}
                        onClear={() => clearAsset('logo')}
                        aspect="aspect-square"
                    />
                </div>

                <Input
                    label="Business name"
                    value={form.business_name}
                    onChange={(e) => set({ business_name: e.target.value })}
                />
                <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                />
                <Input
                    label="Address"
                    value={form.address}
                    onChange={(e) => set({ address: e.target.value })}
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Opening hours
                    </label>
                    <HoursEditor
                        value={form.opening_hours_struct}
                        onChange={(v) => set({ opening_hours_struct: v })}
                    />
                </div>

                <Textarea
                    label="Description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                />
            </form>
        </Modal>
    );
}

function AssetField({ kind, label, url, uploading, onUpload, onClear, aspect }) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div
                className={`${aspect} rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden relative border border-gray-200`}
            >
                {url ? (
                    <img src={url} className="h-full w-full object-cover" alt="" />
                ) : (
                    <span className="text-xs text-gray-400">No {label.toLowerCase()}</span>
                )}
                {url && !uploading && (
                    <button
                        type="button"
                        onClick={onClear}
                        aria-label={`Remove ${label.toLowerCase()}`}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 text-gray-700 hover:bg-white flex items-center justify-center shadow"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-brand-orange-600 cursor-pointer hover:text-brand-orange-700">
                <Upload size={14} />
                {uploading ? `Uploading ${label.toLowerCase()}…` : `Upload ${label.toLowerCase()}`}
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => onUpload(e.target.files?.[0])}
                />
            </label>
        </div>
    );
}
