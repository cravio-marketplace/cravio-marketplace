import { useState } from "react";
import { Plus, Trash2, Image as ImageIcon, Eye, EyeOff, Edit, Coffee, Sun, Moon, Pizza } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";
import EditItemModal from "./EditItemModal";
import BulkUploadModal from "./BulkUploadModal";

const mealTimeIcons = {
  breakfast: <Coffee size={12} />,
  lunch: <Sun size={12} />,
  dinner: <Moon size={12} />,
  snacks: <Pizza size={12} />,
};

export default function MenuTable({ menu, fetchMenu }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categories, setCategories] = useState([]);

  const fetchCategories = async () => {
    const res = await API.get("/vendor/categories");
    setCategories(res.data);
  };

  const deleteItem = async (id) => {
    if (confirm("Delete this item?")) {
      await API.delete(`/menu/${id}`);
      fetchMenu();
      toast.success("Item deleted");
    }
  };

  const toggleAvailability = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    await API.put(`/menu/${id}`, { available: newStatus });
    fetchMenu();
    toast.success(newStatus ? "Item available" : "Item hidden");
  };

  const openEditModal = (item) => {
    fetchCategories();
    setEditingItem(item);
  };

  if (menu.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <ImageIcon className="mx-auto text-gray-300 w-12 h-12 mb-3" />
        <p className="text-gray-500">No menu items yet</p>
        <p className="text-sm text-gray-400 mt-1">Add your first dish to start receiving orders</p>
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={() => setShowAddModal(true)} className="bg-brand-orange text-white px-4 py-2 rounded-xl">
            + Add Item
          </button>
          <button onClick={() => setShowBulkModal(true)} className="border border-brand-orange text-brand-orange px-4 py-2 rounded-xl">
            Bulk Upload
          </button>
        </div>
        {showAddModal && (
          <EditItemModal
            onClose={() => setShowAddModal(false)}
            onSave={fetchMenu}
            categories={categories}
          />
        )}
        {showBulkModal && (
          <BulkUploadModal onClose={() => setShowBulkModal(false)} onComplete={fetchMenu} />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-wrap gap-3">
        <h3 className="font-semibold text-gray-800">Menu Items</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkModal(true)} className="border border-brand-orange text-brand-orange px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            Bulk Upload
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-brand-orange text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {menu.map((item) => {
          const stockText = item.quantity === null ? "∞" : `${item.quantity} left`;
          const isLowStock = item.quantity !== null && item.quantity <= (item.low_stock_threshold || 5);
          const mealIcons = item.meal_time?.map(m => mealTimeIcons[m]).filter(Boolean);

          return (
            <div key={item.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                  <ImageIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800">{item.name}</p>
                    {mealIcons.length > 0 && (
                      <div className="flex gap-1 text-gray-400">{mealIcons}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-sm text-brand-orange font-medium">₦{(item.price / 100).toFixed(2)}</p>
                    {item.category && <p className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{item.category}</p>}
                    <p className={`text-xs ${isLowStock ? 'text-orange-600' : 'text-gray-400'}`}>
                      Stock: {stockText}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleAvailability(item.id, item.available)}
                    className={`p-2 rounded-lg transition ${item.available ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-100"}`}
                    title={item.available ? "Available" : "Unavailable"}
                  >
                    {item.available ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 text-gray-400 hover:text-brand-orange transition"
                    title="Edit item"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <EditItemModal
          onClose={() => setShowAddModal(false)}
          onSave={fetchMenu}
          categories={categories}
        />
      )}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={fetchMenu}
          categories={categories}
        />
      )}
      {showBulkModal && (
        <BulkUploadModal onClose={() => setShowBulkModal(false)} onComplete={fetchMenu} />
      )}
    </div>
  );
}