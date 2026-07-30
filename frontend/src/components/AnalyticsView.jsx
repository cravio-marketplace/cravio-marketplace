import { TrendingUp, Package, Clock, DollarSign } from "lucide-react";
import PopularItems from "./PopularItems";

export default function AnalyticsView({ orders, menu }) {
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "completed");
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_price || 0), 0) / 100;
  const pendingActions = orders.filter(o => o.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Orders" value={totalOrders} icon={Package} color="blue" />
        <StatCard title="Revenue (All time)" value={`₦${totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard title="Pending Actions" value={pendingActions} icon={Clock} color="orange" />
        <StatCard title="Menu Items" value={menu.length} icon={TrendingUp} color="purple" />
      </div>
      <PopularItems orders={orders} menu={menu} />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600"
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${colorClasses[color]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
}