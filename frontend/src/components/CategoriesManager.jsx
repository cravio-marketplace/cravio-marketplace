import { useState, useEffect } from "react";
import { Plus, Trash2, Settings, X } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";

export default function CategoriesManager() {
  const [categories, setCategories] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchKeywords();
  }, []);

  const fetchCategories = async () => {
    const res = await API.get("/vendor/categories");
    setCategories(res.data);
  };

  const fetchKeywords = async () => {
    const res = await API.get("/vendor/keywords");
    setKeywords(res.data);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    setLoading(true);
    await API.post("/vendor/categories", { name: newCategory });
    toast.success("Category added");
    setNewCategory("");
    fetchCategories();
    setLoading(false);
  };

  const deleteCategory = async (id) => {
    if (confirm("Delete this category? Items will become uncategorized.")) {
      await API.delete(`/vendor/categories/${id}`);
      toast.success("Category deleted");
      fetchCategories();
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim() || !selectedCategory) return;
    await API.post("/vendor/keywords", { keyword: newKeyword, category_id: selectedCategory });
    toast.success("Keyword rule added");
    setNewKeyword("");
    setSelectedCategory("");
    setShowKeywordModal(false);
    fetchKeywords();
  };

  const deleteKeyword = async (id) => {
    await API.delete(`/vendor/keywords/${id}`);
    toast.success("Rule deleted");
    fetchKeywords();
  };

  return (
    <div className="space-y-6">
      {/* Categories Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-800">Custom Categories</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="border rounded-lg px-3 py-1 text-sm"
            />
            <button
              onClick={addCategory}
              disabled={loading}
              className="bg-brand-orange text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
              <span className="text-sm">{cat.name}</span>
              <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-gray-400 text-sm">No custom categories yet</p>
          )}
        </div>
      </div>

      {/* Keyword Rules Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Auto-Categorisation Rules</h3>
            <p className="text-sm text-gray-500">When item name contains keyword, auto-assign category</p>
          </div>
          <button
            onClick={() => setShowKeywordModal(true)}
            className="bg-brand-orange text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Add Rule
          </button>
        </div>
        {keywords.length > 0 ? (
          <div className="space-y-2">
            {keywords.map(rule => {
              const cat = categories.find(c => c.id === rule.category_id);
              return (
                <div key={rule.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-mono text-sm">"{rule.keyword}"</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="text-sm bg-brand-orangeLight px-2 py-0.5 rounded">{cat?.name || "Unknown"}</span>
                  </div>
                  <button onClick={() => deleteKeyword(rule.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No rules yet. Add rules to auto-categorise items.</p>
        )}
      </div>

      {/* Add Keyword Modal */}
      {showKeywordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Auto-Categorisation Rule</h3>
              <button onClick={() => setShowKeywordModal(false)}><X size={20} /></button>
            </div>
            <input
              type="text"
              placeholder="Keyword (e.g., 'rice', 'chicken')"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <button
              onClick={addKeyword}
              className="w-full bg-brand-orange text-white py-2 rounded-lg"
            >
              Add Rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}