import { TrendingUp } from "lucide-react";

export default function PopularItems({ orders, menu }) {
  // Count frequency of items from orders (simplified)
  const itemCounts = {};
  orders.forEach((order) => {
    if (order.items && typeof order.items === "object") {
      Object.values(order.items).forEach((item) => {
        const name = item.name;
        itemCounts[name] = (itemCounts[name] || 0) + (item.quantity || 1);
      });
    }
  });

  const popular = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (popular.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center text-gray-400">
        No sales data yet. Complete orders to see popular items.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <TrendingUp size={18} className="text-brand-orange" /> Popular Items
      </h3>
      <div className="space-y-3">
        {popular.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-gray-700">{item.name}</span>
            <span className="text-sm font-medium text-brand-orange">{item.count} orders</span>
          </div>
        ))}
      </div>
    </div>
  );
}