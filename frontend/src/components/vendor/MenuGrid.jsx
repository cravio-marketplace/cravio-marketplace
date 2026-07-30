/**
 * MenuGrid — card-hybrid grid view of menu items with sort/filter.
 */
import { useMemo, useState } from 'react';
import { Plus, Search, SlidersHorizontal, Upload } from 'lucide-react';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import MenuCard from './MenuCard';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';

const SORTS = [
    { value: 'name', label: 'Name (A→Z)' },
    { value: 'price-asc', label: 'Price (low→high)' },
    { value: 'price-desc', label: 'Price (high→low)' },
    { value: 'stock', label: 'Stock (lowest first)' },
    { value: 'meal', label: 'Meal time' },
];

export default function MenuGrid({
    menu,
    onAdd,
    onEdit,
    onDelete,
    onToggleAvailability,
    onRestock,
    onBulkUpload,
    categories = [],
}) {
    const [q, setQ] = useState('');
    const [sort, setSort] = useState('name');
    const [category, setCategory] = useState('');
    const [restockTarget, setRestockTarget] = useState(null);
    const [restockQty, setRestockQty] = useState('');

    const visible = useMemo(() => {
        let list = [...menu];
        if (q) list = list.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
        if (category) list = list.filter((i) => i.category === category);
        switch (sort) {
            case 'price-asc':
                list.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                list.sort((a, b) => b.price - a.price);
                break;
            case 'stock':
                list.sort(
                    (a, b) => (a.quantity ?? Infinity) - (b.quantity ?? Infinity)
                );
                break;
            case 'meal':
                list.sort(
                    (a, b) =>
                        (a.meal_time?.[0] || 'zzz').localeCompare(b.meal_time?.[0] || 'zzz')
                );
                break;
            default:
                list.sort((a, b) => a.name.localeCompare(b.name));
        }
        return list;
    }, [menu, q, sort, category]);

    if (menu.length === 0) {
        return <EmptyState variant="menu" onAction={onAdd} />;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search menu..."
                        className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
                    />
                </div>
                <Select
                    options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.name, label: c.name }))]}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-44"
                />
                <Select
                    options={SORTS}
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-48"
                />
                {onBulkUpload && (
                    <Button variant="secondary" onClick={onBulkUpload}>
                        <Upload size={14} /> Bulk upload
                    </Button>
                )}
                <Button onClick={onAdd}>
                    <Plus size={16} /> Add item
                </Button>
            </div>

            {visible.length === 0 ? (
                <EmptyState variant="search" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {visible.map((item) => (
                        <MenuCard
                            key={item.id}
                            item={item}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onToggleAvailability={onToggleAvailability}
                            onRestock={setRestockTarget}
                        />
                    ))}
                </div>
            )}

            <Modal
                open={!!restockTarget}
                onClose={() => setRestockTarget(null)}
                title={`Restock · ${restockTarget?.name || ''}`}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setRestockTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!Number(restockQty)}
                            onClick={async () => {
                                await onRestock(restockTarget.id, Number(restockQty));
                                setRestockTarget(null);
                                setRestockQty('');
                            }}
                        >
                            Add stock
                        </Button>
                    </>
                }
            >
                <Input
                    label="Quantity to add"
                    type="number"
                    min={1}
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    hint="Current stock will be increased by this amount."
                />
            </Modal>
        </div>
    );
}
