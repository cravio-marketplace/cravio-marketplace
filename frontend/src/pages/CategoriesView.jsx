/**
 * CategoriesView — manage vendor categories and keyword auto-categorisation
 * rules in one tabbed screen.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { fetchCategories, createCategory, deleteCategory } from '../api/menu';
import { fetchKeywords, createKeyword, deleteKeyword } from '../api/menu';

export default function CategoriesView() {
    return (
        <div className="max-w-3xl space-y-4">
            <CategoriesSection />
            <KeywordsSection />
        </div>
    );
}

function CategoriesSection() {
    const [items, setItems] = useState([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const load = async () => {
        const { data } = await fetchCategories();
        setItems(data.categories || []);
    };

    useEffect(() => {
        load();
    }, []);

    const add = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            await createCategory(name.trim());
            setName('');
            toast.success('Category added');
            await load();
        } catch {
            toast.error('Failed to add category');
        } finally {
            setLoading(false);
        }
    };

    const remove = async (id) => {
        if (!window.confirm('Delete this category?')) return;
        await deleteCategory(id);
        toast.success('Category removed');
        load();
    };

    return (
        <Card className="p-5 space-y-4">
            <div>
                <h3 className="font-semibold text-gray-900">Categories</h3>
                <p className="text-sm text-gray-500">Group your menu items — useful for filters and reports.</p>
            </div>
            <form onSubmit={add} className="flex flex-col sm:flex-row gap-2">
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Swallows"
                    className="flex-1"
                />
                <Button type="submit" loading={loading}>
                    <Plus size={14} /> Add
                </Button>
            </form>
            {items.length === 0 ? (
                <EmptyState variant="menu" action="Add category" onAction={() => {}} />
            ) : (
                <ul className="space-y-2">
                    {items.map((c) => (
                        <li
                            key={c.id}
                            className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
                        >
                            <span className="text-sm font-medium text-gray-800">{c.name}</span>
                            <button
                                onClick={() => remove(c.id)}
                                className="h-8 w-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"
                            >
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

function KeywordsSection() {
    const [rules, setRules] = useState([]);
    const [categories, setCategories] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [categoryId, setCategoryId] = useState('');

    const load = async () => {
        const [kw, cat] = await Promise.all([fetchKeywords(), fetchCategories()]);
        setRules(kw.data.keywords || []);
        setCategories(cat.data.categories || []);
        if (cat.data.categories?.[0] && !categoryId) {
            setCategoryId(String(cat.data.categories[0].id));
        }
    };

    useEffect(() => {
        load();
    }, []);

    const add = async (e) => {
        e.preventDefault();
        if (!keyword || !categoryId) {
            toast.error('Pick a keyword and a category');
            return;
        }
        await createKeyword({ keyword, category_id: parseInt(categoryId, 10) });
        setKeyword('');
        toast.success('Rule added');
        load();
    };

    const remove = async (id) => {
        await deleteKeyword(id);
        load();
    };

    return (
        <Card className="p-5 space-y-4">
            <div>
                <h3 className="font-semibold text-gray-900">Auto-categorisation rules</h3>
                <p className="text-sm text-gray-500">
                    When a new item name matches a keyword, we suggest the linked category.
                </p>
            </div>
            <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Keyword (e.g. rice)"
                />
                <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
                />
                <Button type="submit">
                    <Plus size={14} /> Add rule
                </Button>
            </form>
            {rules.length === 0 ? (
                <p className="text-sm text-gray-500">No rules yet.</p>
            ) : (
                <ul className="space-y-2">
                    {rules.map((r) => (
                        <li
                            key={r.id}
                            className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2"
                        >
                            <div className="text-sm text-gray-800">
                                <span className="font-medium">"{r.keyword}"</span> → {r.vendor_categories?.name || '—'}
                            </div>
                            <button
                                onClick={() => remove(r.id)}
                                className="h-8 w-8 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center"
                            >
                                <Trash2 size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
