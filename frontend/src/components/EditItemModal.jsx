import { useState, useEffect } from "react";
import { X, Plus, Trash2, Clock } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";

export default function EditItemModal({ item, onClose, onSave, categories }) {
  const [name, setName] = useState(item?.name || "");
  const [price, setPrice] = useState(item ? (item.price / 100).toString() : "");
  const [category, setCategory] = useState(item?.category || "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [quantity, setQuantity] = useState(item?.quantity === null ? "" : item?.quantity);
  const [lowStockThreshold, setLowStockThreshold] = useState(item?.low_stock_threshold || 5);
  const [mealTimes, setMealTimes] = useState(item?.meal_time || []);
  const [variations, setVariations] = useState(item?.variations || []);
  const [loading, setLoading] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  const mealTimeOptions = [
    { id: "breakfast", label: "Breakfast", icon: "🍳", time: "5AM - 11AM" },
    { id: "lunch", label: "Lunch", icon: "🍔", time: "11AM - 5PM" },
    { id: "dinner", label: "Dinner", icon: "🍽️", time: "5PM - 10PM" },
    { id: "snacks", label: "Snacks", icon: "🍿", time: "Anytime" },
  ];

  const toggleMealTime = (mealId) => {
    if (mealTimes.includes(mealId)) {
      setMealTimes(mealTimes.filter(m => m !== mealId));
    } else {
      setMealTimes([...mealTimes, mealId]);
    }
  };

  const addVariation = () => {
    setVariations([...variations, { name: "", price: "", quantity: "", available: true, isNew: true }]);
  };

  const updateVariation = (index, field, value) => {
    const updated = [...variations];
    updated[index][field] = value;
    setVariations(updated);
  };

  const removeVariation = (index) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const addCustomCategory = async () => {
    if (!customCategory.trim()) return;
    try {
      const res = await API.post("/vendor/categories", { name: customCategory });
      toast.success("Category added");
      setCategory(res.data.id.toString());
      setCustomCategory("");
      setShowNewCategory(false);
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const priceInKobo = Math.round(parseFloat(price) * 100);
    const payload = {
      name,
      price: priceInKobo,
      category: category || null,
      available,
      quantity: quantity === "" ? null : parseInt(quantity),
      low_stock_threshold: lowStockThreshold,
      meal_time: mealTimes,
      variations: variations.map(v => ({
        name: v.name,
        price: Math.round(parseFloat(v.price) * 100),
        quantity: v.quantity === "" ? null : parseInt(v.quantity),
        available: v.available !== false
      }))
    };

    try {
      if (item) {
        await API.put(`/menu/${item.id}`, payload);
        toast.success("Item updated");
      } else {
        await API.post("/menu", payload);
        toast.success("Item added");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error("Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const isLowStock = quantity !== null && quantity <= lowStockThreshold && quantity > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">{item ? "Edit Item" : "Add New Item"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-orange/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₦) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2"
              >
                <option value="">Uncategorized</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                New
              </button>
            </div>
            {showNewCategory && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="New category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomCategory}
                  className="px-3 py-2 bg-brand-orange text-white rounded-lg text-sm"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
                <span className="text-xs text-gray-400 ml-2">(leave empty for unlimited)</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Unlimited"
              />
              {isLowStock && (
                <p className="text-xs text-orange-600 mt-1">⚠️ Low stock! Only {quantity} left</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Meal Times */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Meal Times</label>
            <div className="flex flex-wrap gap-2">
              {mealTimeOptions.map(meal => (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => toggleMealTime(meal.id)}
                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition ${mealTimes.includes(meal.id)
                      ? "bg-brand-orange text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  <span>{meal.icon}</span>
                  {meal.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variations */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Variations (e.g., Small, Large)</label>
              <button
                type="button"
                onClick={addVariation}
                className="text-brand-orange text-sm flex items-center gap-1"
              >
                <Plus size={14} /> Add Variation
              </button>
            </div>
            {variations.length > 0 && (
              <div className="space-y-3">
                {variations.map((v, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg">
                    <input
                      type="text"
                      placeholder="Name (e.g., Small)"
                      value={v.name}
                      onChange={(e) => updateVariation(idx, "name", e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Price (₦)"
                      value={v.price}
                      onChange={(e) => updateVariation(idx, "price", e.target.value)}
                      className="w-28 border rounded px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Stock"
                      value={v.quantity}
                      onChange={(e) => updateVariation(idx, "quantity", e.target.value)}
                      className="w-20 border rounded px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariation(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="font-medium">Available for ordering</p>
              <p className="text-sm text-gray-500">Unavailable items won't show to customers</p>
            </div>
            <button
              type="button"
              onClick={() => setAvailable(!available)}
              className={`px-4 py-2 rounded-lg font-medium ${available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {available ? "Available" : "Unavailable"}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-orange text-white py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Item"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 py-2 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}