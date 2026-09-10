/**
 * MenuGrid — professional management view of menu items grouped by category.
 */
import { useMemo, useState } from 'react';
import { Plus, Search, Upload, MoreVertical, Trash2, Edit3, PackagePlus } from 'lucide-react';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import Toggle from '../common/Toggle';

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
    const [menuOpenId, setMenuOpenId] = useState(null);

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
                list.sort((a, b) => (a.quantity ?? Infinity) - (b.quantity ?? Infinity));
                break;
            case 'meal':
                list.sort((a, b) => (a.meal_time?.[0] || 'zzz').localeCompare(b.meal_time?.[0] || 'zzz'));
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
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search menu items..."
                        className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange-200 focus:border-brand-orange-500"
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
                <div className="flex gap-2 ml-auto">
                    {onBulkUpload && (
                        <Button variant="secondary" onClick={onBulkUpload}>
                            <Upload size={14} /> Bulk
                        </Button>
                    )}
                    <Button onClick={onAdd}>
                        <Plus size={16} /> Add item
                    </Button>
                </div>
            </div>

            {visible.length === 0 ? (
                <EmptyState variant="search" />
            ) : (
                <div className="space-y-8">
                    {categories.map((cat) => {
                        const itemsInCategory = visible.filter(i => i.category === cat.name);
                        if (itemsInCategory.length === 0) return null;
                        return (
                            <div key={cat.id} className="space-y-3">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <h3 className="text-lg font-semibold text-gray-900">{cat.name}</h3>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {itemsInCategory.length} item{itemsInCategory.length === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {itemsInCategory.map(item => (
                                        <MenuItemRow
                                            key={item.id}
                                            item={item}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onToggleAvailability={onToggleAvailability}
                                            onRestock={setRestockTarget}
                                            menuOpenId={menuOpenId}
                                            setMenuOpenId={setMenuOpenId}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Uncategorized items */}
                    {(() => {
                        const uncategorized = visible.filter(i => !i.category);
                        if (uncategorized.length === 0) return null;
                        return (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <h3 className="text-lg font-semibold text-gray-900">Uncategorized</h3>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {uncategorized.length} item{uncategorized.length === 1 ? '' : 's'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {uncategorized.map(item => (
                                        <MenuItemRow
                                            key={item.id}
                                            item={item}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onToggleAvailability={onToggleAvailability}
                                            onRestock={setRestockTarget}
                                            menuOpenId={menuOpenId}
                                            setMenuOpenId={setMenuOpenId}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
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

function MenuItemRow({ item, onEdit, onDelete, onToggleAvailability, onRestock, menuOpenId, setMenuOpenId }) {
    return (
        <div className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl hover:border-brand-orange-200 transition-colors group">
            <div className="h-12 w-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <span className="text-[10px]">No image</span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <span className="text-xs text-gray-500">₦{item.price / 100}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <PackagePlus size={12} />
                        {item.quantity === null ? 'Unlimited' : `${item.quantity} in stock`}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-2">
                    <span className="text-xs text-gray-500">Available</span>
                    <Toggle
                        checked={item.available}
                        onChange={onToggleAvailability}
                    />
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                        className="p-3 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <MoreVertical size={16} />
                    </button>
                    {menuOpenId === item.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-10 py-1 animate-in fade-in slide-in-from-top-1">
                            <button
                                onClick={() => { onEdit(item); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                                <Edit3 size={14} /> Edit item
                            </button>
                            <button
                                onClick={() => { onDelete(item); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Delete item
                            </button>
                            <button
                                onClick={() => { onRestock(item); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-brand-orange-600 hover:bg-orange-50 flex items-center gap-2"
                            >
                                <PackagePlus size={14} /> Quick restock
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
