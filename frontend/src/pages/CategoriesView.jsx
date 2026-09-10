/**
 * CategoriesView — manage vendor categories and keyword auto-categorisation
 * rules in one tabbed screen.
 *
 * Categories: free-text list scoped to the current vendor. Duplicate names
 * are blocked server-side with a 409; we surface the backend's friendly
 * message so the user sees "You already have a category called X" instead
 * of a raw error toast.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, MoreVertical, Search } from 'lucide-react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { fetchCategories, createCategory, deleteCategory } from '../api/menu';
import { fetchKeywords, createKeyword, deleteKeyword } from '../api/menu';
import { mapError } from '../api/client';

export default function CategoriesView() {
    return (
        <div className="max-w-3xl space-y-6">
            <CategoriesSection />
            <KeywordsSection />
        </div>
    );
}

function CategoriesSection() {
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [searchQ, setSearchQ] = useState('');

    const load = async () => {
        try {
            const { data } = await fetchCategories();
            setCategories(data.categories || []);
        } catch {
            toast.error('Could not load categories');
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQ.toLowerCase())
    );

    const addRule = async (e) => {
        if (e) e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) return;

        // Optimistic Update
        const tempId = crypto.randomUUID();
        const newCat = { id: tempId, name: trimmedName, isOptimistic: true };
        setCategories(prev => [...prev, newCat]);
        setName('');
        setLoading(true);

        try {
            await createCategory(trimmedName);
            toast.success('Category added');
            await load(); // Sync with server
        } catch (err) {
            setCategories(prev => prev.filter(c => c.id !== tempId));
            toast.error(mapError(err));
        } finally {
            setLoading(false);
        }
    };

    const remove = async () => {
        if (!deletingId) return;
        try {
            await deleteCategory(deletingId);
            toast.success('Category removed');
            setDeletingId(null);
            await load();
        } catch (err) {
            toast.error(mapError(err));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Card className="p-6 space-y-6">
            <div>
                <h3 className="font-semibold text-gray-900">Categories</h3>
                <p className="text-sm text-gray-500">Manage how your menu items are grouped.</p>
            </div>

            <form onSubmit={addRule} className="flex flex-col sm:flex-row gap-2">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addRule(e)}
                    placeholder="Category name, e.g. Breakfast"
                    className="flex-1"
                />
                <Button type="submit" loading={loading}>
                    <Plus size={14} /> Add
                </Button>
            </form>

            {categories.length > 0 && (
                <div className="relative">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange-200 focus:border-brand-orange-500"
                    />
                </div>
            )}

            {categories.length === 0 ? (
                <EmptyState
                    variant="menu"
                    title="No categories yet"
                    description="Create categories like Breakfast, Rice, Drinks or Snacks to organize your menu."
                    action="Create first category"
                    onAction={() => document.querySelector('input')?.focus()}
                />
            ) : (
                <div className="space-y-2">
                    {filteredCategories.map((c) => (
                        <div
                            key={c.id}
                            className="group flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-sm font-medium ${c.isOptimistic ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                                    {c.name}
                                </span>
                                {c.isOptimistic && <span className="text-[10px] text-gray-400 animate-pulse">Adding...</span>}
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                                >
                                    <MoreVertical size={16} />
                                </button>
                                {menuOpenId === c.id && (
                                    <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 animate-in fade-in slide-in-from-top-1">
                                        <button
                                            onClick={() => { setMenuOpenId(null); setDeletingId(c.id); }}
                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={!!deletingId}
                title="Delete category?"
                description={`Are you sure you want to delete this category? This will not delete the menu items, but they will become uncategorized.`}
                confirmLabel="Delete"
                variant="danger"
                onCancel={() => setDeletingId(null)}
                onConfirm={remove}
            />
        </Card>
    );
}

function KeywordsSection() {
    const [rules, setRules] = useState([]);
    const [categories, setCategories] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            const [kw, cat] = await Promise.all([fetchKeywords(), fetchCategories()]);
            setRules(kw.data.keywords || []);
            setCategories(cat.data.categories || []);
            if (cat.data.categories?.[0] && !categoryId) {
                setCategoryId(String(cat.data.categories[0].id));
            }
        } catch {
            toast.error('Could not load auto-categorisation rules');
        }
    };

    useEffect(() => {
        load();
    }, []);

    const addRule = async (e) => {
        if (e) e.preventDefault();
        if (!keyword || !categoryId) {
            toast.error('Pick a keyword and a category');
            return;
        }

        const trimmedKw = keyword.trim();
        const tempId = crypto.randomUUID();
        const newRule = {
            id: tempId,
            keyword: trimmedKw,
            vendor_categories: { name: categories.find(c => String(c.id) === categoryId)?.name },
            isOptimistic: true
        };

        setRules(prev => [...prev, newRule]);
        setKeyword('');
        setLoading(true);

        try {
            await createKeyword({ keyword: trimmedKw, category_id: parseInt(categoryId, 10) });
            toast.success('Rule added');
            await load();
        } catch (err) {
            setRules(prev => prev.filter(r => r.id !== tempId));
            toast.error(mapError(err));
        } finally {
            setLoading(false);
        }
    };

    const remove = async (id) => {
        try {
            await deleteKeyword(id);
            await load();
        } catch (err) {
            toast.error(mapError(err));
        }
    };

    return (
        <Card className="p-6 space-y-6">
            <div>
                <h3 className="font-semibold text-gray-900">Auto-categorisation</h3>
                <p className="text-sm text-gray-500">Automatically suggest categories when food names match your keywords.</p>
            </div>

            <form onSubmit={addRule} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addRule(e)}
                    placeholder="Keyword (e.g. rice)"
                />
                <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                />
                <Button type="submit" loading={loading}>
                    <Plus size={14} /> Add rule
                </Button>
            </form>

            {rules.length === 0 ? (
                <p className="text-sm text-gray-500">No rules yet.</p>
            ) : (
                <div className="space-y-2">
                    {rules.map((r) => (
                        <div
                            key={r.id}
                            className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="text-sm text-gray-800">
                                <span className="font-medium">"{r.keyword}"</span> → {r.vendor_categories?.name || '—'}
                                {r.isOptimistic && <span className="ml-2 text-[10px] text-gray-400 animate-pulse">Adding...</span>}
                            </div>
                            <button
                                onClick={() => remove(r.id)}
                                aria-label={`Delete rule for ${r.keyword}`}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
