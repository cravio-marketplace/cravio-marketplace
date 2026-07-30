import { TrendingUp, Package, Clock } from "lucide-react";

export default function StatsCards({ stats }) {
  const cards = [
    {
      label: "Total Orders",
      value: stats.totalOrders,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Revenue (Today)",
      value: `₦${stats.revenue.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending Actions",
      value: stats.pending,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
          </div>
          <div className={`p-3 rounded-full ${card.bg}`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
}