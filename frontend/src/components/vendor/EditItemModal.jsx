/**
 * EditItemModal — create / edit a menu item.
 *
 * Image upload goes through `api/uploads.js` so the 5 MB limit, friendly
 * error messages, and folder convention live in exactly one place. The
 * modal owns the upload state (progress / failure) but the network
 * mechanics are centralised.
 *
 * On save the parent gets a payload ready for POST/PUT /api/menu.
 */
import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import { uploadMenuImage } from '../../api/uploads';
import { mapError } from '../../api/client';
import { MEAL_TIME_OPTIONS, FOOD_CATEGORIES } from '../../utils/constants';

export default function EditItemModal({ item, categories = [], onClose, onSave }) {
    const [form, setForm] = useState({
        name: item?.name || '',
        price: item ? (item.price / 100).toString() : '',
        category: item?.category || '',
        available: item?.available ?? true,
        quantity: item?.quantity ?? '',
        low_stock_threshold: item?.low_stock_threshold ?? 5,
        meal_time: item?.meal_time || [],
        image_url: item?.image_url || '',
    });
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    const toggleMeal = (id) =>
        set({
            meal_time: form.meal_time.includes(id)
                ? form.meal_time.filter((m) => m !== id)
                : [...form.meal_time, id],
        });

    const uploadImage = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const { url } = await uploadMenuImage(file);
            set({ image_url: url });
            toast.success('Image uploaded');
        } catch (e) {
            toast.error(e.message || 'Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const clearImage = () => set({ image_url: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.price) {
            toast.error('Name and price are required');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                name: form.name,
                price: Math.round(parseFloat(form.price) * 100),
                category: form.category || null,
                available: form.available,
                quantity: form.quantity === '' ? null : parseInt(form.quantity, 10),
                low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 5,
                meal_time: form.meal_time,
                image_url: form.image_url || null,
            };
            await onSave(payload);
            onClose?.();
        } catch (err) {
            toast.error(mapError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={item ? 'Edit item' : 'Add a new item'}
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={loading || uploading}>
                        {uploading ? 'Uploading image...' : 'Save item'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Image uploader */}
                <div className="flex items-center gap-4">
                    <div className="h-24 w-24 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 relative">
                        {form.image_url ? (
                            <img
                                src={form.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <span className="text-xs text-gray-400">No image</span>
                        )}
                        {form.image_url && !uploading && (
                            <button
                                type="button"
                                onClick={clearImage}
                                aria-label="Remove image"
                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/90 text-gray-700 hover:bg-white flex items-center justify-center shadow"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <label className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 disabled:opacity-50">
                        <Upload size={14} />
                        {uploading ? 'Uploading…' : 'Upload image'}
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => uploadImage(e.target.files?.[0])}
                        />
                    </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Name"
                        value={form.name}
                        onChange={(e) => set({ name: e.target.value })}
                        placeholder="Jollof rice"
                        required
                    />
                    <Input
                        label="Price (₦)"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.price}
                        onChange={(e) => set({ price: e.target.value })}
                        placeholder="1500"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        label="Category"
                        value={form.category}
                        onChange={(e) => set({ category: e.target.value })}
                        options={[
                            { value: '', label: 'Choose category' },
                            ...FOOD_CATEGORIES.map((name) => ({ value: name, label: name })),
                        ]}
                    />
                    <Input
                        label="Low-stock alert at"
                        type="number"
                        min={0}
                        value={form.low_stock_threshold}
                        onChange={(e) => set({ low_stock_threshold: e.target.value })}
                        hint="Show an orange badge when stock falls to or below this number."
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="Stock (leave empty for unlimited)"
                        type="number"
                        min={0}
                        value={form.quantity}
                        onChange={(e) => set({ quantity: e.target.value })}
                    />
                    <Select
                        label="Available for ordering?"
                        value={String(form.available)}
                        onChange={(e) => set({ available: e.target.value === 'true' })}
                        options={[
                            { value: 'true', label: 'Available' },
                            { value: 'false', label: 'Hidden' },
                        ]}
                    />
                </div>

                <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Meal time</p>
                    <div className="flex flex-wrap gap-2">
                        {MEAL_TIME_OPTIONS.map((m) => {
                            const active = form.meal_time.includes(m.id);
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => toggleMeal(m.id)}
                                    className={`rounded-xl px-3 py-1.5 text-sm flex items-center gap-1 border ${
                                        active
                                            ? 'bg-brand-orange-500 text-white border-brand-orange-500'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{m.icon}</span> {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

            </form>
        </Modal>
    );
}
