import { Activity, CheckCircle, Package, Truck } from "lucide-react";

export default function ActivityLog({ orders }) {
  const recentActivities = orders
    .slice(0, 10)
    .map((order) => ({
      id: order.id,
      status: order.status,
      time: order.created_at,
    }))
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  const getIcon = (status) => {
    switch (status) {
      case "pending":
        return <Package className="w-4 h-4 text-yellow-500" />;
      case "accepted":
        return <Truck className="w-4 h-4 text-blue-500" />;
      case "ready":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Activity Log</h3>
      {recentActivities.length === 0 ? (
        <div className="text-center text-gray-400 py-8">No activity yet</div>
      ) : (
        <div className="space-y-3">
          {recentActivities.map((act) => (
            <div key={act.id} className="flex items-center gap-3 text-sm">
              <div className="w-6">{getIcon(act.status)}</div>
              <div className="flex-1">
                <span className="capitalize">{act.status}</span> – Order #{act.id}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(act.time).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}