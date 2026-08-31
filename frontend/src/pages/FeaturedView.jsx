/**
 * FeaturedView — promote menu items to the top of the student feed.
 *
 * Vendors pick an item, priority (1-10), and duration. Payment will be
 * wired up later (Paystack), so for now the request sits in `pending`.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Star, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import { fetchFeatured, createFeatured, deleteFeatured } from '../api/menu';
import { FEATURED_DURATIONS } from '../utils/constants';
import { formatNaira, formatDate } from '../utils/formatters';

export default function FeaturedView({ menu = [] }) {
    const [featured, setFeatured] = useState([]);
    const [form, setForm] = useState({ menu_item_id: '', priority: 5, duration: 7 });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        const { data } = await fetchFeatured();
        setFeatured(data.featured || []);
    };

    useEffect(() => {
        load();
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.menu_item_id) {
            toast.error('Pick a menu item');
            return;
        }
        setSubmitting(true);
        try {
            const expires_at = new Date(Date.now() + form.duration * 24 * 60 * 60 * 1000).toISOString();
            await createFeatured({
                menu_item_id: parseInt(form.menu_item_id, 10),
                priority: form.priority,
                expires_at,
            });
            toast.success('Featured request submitted');
            setForm({ menu_item_id: '', priority: 5, duration: 7 });
            load();
        } catch {
            toast.error('Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Cancel this featured request?')) return;
        await deleteFeatured(id);
        toast.success('Removed');
        load();
    };

    return (
        <div className="max-w-3xl space-y-4">
            <Card className="p-5 bg-gradient-to-br from-brand-orange-50 to-white">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-brand-orange-500 text-white flex items-center justify-center">
                        <Star size={18} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Promote an item to the top</h3>
                        <p className="text-sm text-gray-600">
                            Featured items appear at the top of the student feed.
                            <span className="block mt-1 text-brand-orange-700 font-medium">
                                Coming soon: ₦5,000/week via Paystack.
                            </span>
                        </p>
                    </div>
                </div>
                <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 mt-4">
                    <Select
                        label="Item"
                        value={form.menu_item_id}
                        onChange={(e) => setForm({ ...form, menu_item_id: e.target.value })}
                        options={[
                            { value: '', label: 'Choose an item' },
                            ...menu.map((m) => ({ value: String(m.id), label: `${m.name} (${formatNaira(m.price)})` })),
                        ]}
                    />
                    <Input
                        label="Priority (1-10)"
                        type="number"
                        min={1}
                        max={10}
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) || 5 })}
                    />
                    <Select
                        label="Duration"
                        value={form.duration}
                        onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value, 10) })}
                        options={FEATURED_DURATIONS}
                    />
                    <div className="flex items-end">
                        <Button type="submit" loading={submitting} className="w-full">
                            Submit
                        </Button>
                    </div>
                </form>
            </Card>

            {featured.length === 0 ? (
                <Card className="p-6">
                    <EmptyState variant="featured" />
                </Card>
            ) : (
                <ul className="space-y-2">
                    {featured.map((f) => {
                        const item = f.menu_items || {};
                        return (
                            <li key={f.id}>
                                <Card className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900">{item.name || `Item #${f.menu_item_id}`}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Priority {f.priority} · Expires {formatDate(f.expires_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge tone={f.status === 'approved' ? 'green' : 'orange'}>
                                            {f.status || 'pending'}
                                        </Badge>
                                        <button
                                            onClick={() => remove(f.id)}
                                            className="h-8 w-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </Card>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
