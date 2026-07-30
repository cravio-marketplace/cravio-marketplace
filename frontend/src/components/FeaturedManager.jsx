import { useState, useEffect } from "react";
import { Star, Calendar, DollarSign, Clock } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";

export default function FeaturedManager({ menu }) {
  const [featuredItems, setFeaturedItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [priority, setPriority] = useState(5);
  const [expiryDays, setExpiryDays] = useState(7);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFeaturedItems();
  }, []);

  const fetchFeaturedItems = async () => {
    try {
      const res = await API.get("/vendor/featured");
      setFeaturedItems(res.data);
    } catch (error) {
      console.error("Failed to fetch featured", error);
    }
  };

  const requestFeatured = async () => {
    if (!selectedItem) {
      toast.error("Select an item");
      return;
    }

    setLoading(true);
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expiryDays);

    try {
      await API.post("/vendor/featured", {
        menu_item_id: parseInt(selectedItem),
        priority,
        expires_at: expires_at.toISOString(),
      });
      toast.success("Featured request submitted! Admin will review it.");
      setSelectedItem("");
      fetchFeaturedItems();
    } catch (error) {
      toast.error("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Request Form */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star className="text-yellow-500" size={20} />
          <h3 className="font-semibold text-gray-800">Promote Your Item</h3>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Coming Soon: Paid Feature</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Get your item featured on the homepage billboard. For now, requests are reviewed manually.
          <strong className="block mt-1">Pricing starts at ₦5,000/week</strong>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Item</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Choose an item</option>
              {menu.map(item => (
                <option key={item.id} value={item.id}>{item.name} - ₦{(item.price / 100).toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
              <input
                type="range"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 text-center">{priority} – {priority >= 8 ? "High" : priority >= 5 ? "Medium" : "Low"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>

          <button
            onClick={requestFeatured}
            disabled={loading || !selectedItem}
            className="w-full bg-brand-orange text-white py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Submitting..." : "Request Featured (Free for now)"}
          </button>
        </div>
      </div>

      {/* Current Featured Items */}
      {featuredItems.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Your Featured Items</h3>
          <div className="space-y-3">
            {featuredItems.map(feat => {
              const item = menu.find(m => m.id === feat.menu_item_id);
              const daysLeft = getDaysLeft(feat.expires_at);
              return (
                <div key={feat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{item?.name || "Unknown"}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Star size={12} /> Priority {feat.priority}</span>
                      {daysLeft > 0 ? (
                        <span className="flex items-center gap-1"><Clock size={12} /> {daysLeft} days left</span>
                      ) : (
                        <span className="text-red-500">Expired</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Status: Pending</p>
                    <p className="text-xs text-gray-400">Awaiting admin approval</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}