/**
 * EditProfileModal — used by both the profile view and settings.
 */
import { useState } from 'react';
import { Upload } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Button from '../common/Button';
import supabase from '../../api/supabaseClient';

export default function EditProfileModal({ vendor, onClose, onSave }) {
    const [form, setForm] = useState({
        business_name: vendor?.business_name || '',
        phone: vendor?.phone || '',
        description: vendor?.description || '',
        address: vendor?.address || '',
        opening_hours: vendor?.opening_hours || '',
        logo_url: vendor?.logo_url || '',
        cover_url: vendor?.cover_url || '',
    });
    const [saving, setSaving] = useState(false);

    const uploadFile = async (file, kind) => {
        if (!file) return;
        const path = `vendor/${vendor.id}/${kind}-${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('vendor-images').upload(path, file, { upsert: true });
        if (error) return;
        const { data } = supabase.storage.from('vendor-images').getPublicUrl(path);
        setForm((f) => ({ ...f, [`${kind}_url`]: data.publicUrl }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(form);
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
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Cover image</label>
                        <div className="h-32 rounded-xl bg-gray-100 overflow-hidden">
                            {form.cover_url ? (
                                <img src={form.cover_url} className="h-full w-full object-cover" alt="" />
                            ) : null}
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm text-brand-orange cursor-pointer">
                            <Upload size={14} /> Upload cover
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => uploadFile(e.target.files?.[0], 'cover')}
                            />
                        </label>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Logo</label>
                        <div className="h-32 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                            {form.logo_url ? (
                                <img src={form.logo_url} className="h-full w-full object-cover" alt="" />
                            ) : (
                                <span className="text-xs text-gray-400">No logo</span>
                            )}
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm text-brand-orange cursor-pointer">
                            <Upload size={14} /> Upload logo
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => uploadFile(e.target.files?.[0], 'logo')}
                            />
                        </label>
                    </div>
                </div>

                <Input
                    label="Business name"
                    value={form.business_name}
                    onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                />
                <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <Input
                    label="Address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <Input
                    label="Opening hours"
                    value={form.opening_hours}
                    onChange={(e) => setForm({ ...form, opening_hours: e.target.value })}
                    placeholder="e.g. Mon-Fri 8am-9pm"
                />
                <Textarea
                    label="Description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
            </form>
        </Modal>
    );
}
