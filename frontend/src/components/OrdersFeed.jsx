import { useState } from "react";
import { CheckCircle, Package, Clock } from "lucide-react";
import toast from "react-hot-toast";
import API from "../api";


export default function OrdersFeed({ orders, fetchOrders }) {
  const acceptOrder = async (id) => {
    await API.post(`/orders/${id}/accept`);
    fetchOrders();
    toast.success("Order accepted");
  };

  const markReady = async (id) => {
    const res = await API.post(`/orders/${id}/ready`);
    if (res.data.success) {
      fetchOrders();
      toast.success(`Pickup code: ${res.data.code}`);
    }
  };

  const completeOrder = async (id, code) => {
    if (!code) return toast.error("Enter pickup code");
    await API.post(`/orders/${id}/complete`, { code });
    fetchOrders();
    toast.success("Order completed");
  };

  const pending = orders.filter((o) => o.status === "pending");
  const accepted = orders.filter((o) => o.status === "accepted");
  const ready = orders.filter((o) => o.status === "ready");
  const completed = orders.filter((o) => o.status === "completed");

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <Package className="mx-auto text-gray-300 w-12 h-12 mb-3" />
        <p className="text-gray-500">No orders yet</p>
        <p className="text-sm text-gray-400 mt-1">New orders will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 mb-4">Active Orders</h3>
      <div className="space-y-4">
        {pending.map((order) => (
          <OrderCard key={order.id} order={order} type="pending" onAction={() => acceptOrder(order.id)} />
        ))}
        {accepted.map((order) => (
          <OrderCard key={order.id} order={order} type="accepted" onAction={() => markReady(order.id)} />
        ))}
        {ready.map((order) => (
          <OrderCard key={order.id} order={order} type="ready" onComplete={(code) => completeOrder(order.id, code)} />
        ))}
        {completed.slice(0, 5).map((order) => (
          <OrderCard key={order.id} order={order} type="completed" />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, type, onAction, onComplete }) {
  const [code, setCode] = useState("");

  const statusConfig = {
    pending: { label: "Pending", color: "text-yellow-600", bg: "bg-yellow-50", button: "Accept" },
    accepted: { label: "Accepted", color: "text-blue-600", bg: "bg-blue-50", button: "Mark Ready" },
    ready: { label: "Ready", color: "text-green-600", bg: "bg-green-50", button: "Complete" },
    completed: { label: "Completed", color: "text-gray-500", bg: "bg-gray-50" },
  };
  const config = statusConfig[type];

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-gray-800">Order #{order.id}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(order.created_at).toLocaleTimeString()}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {order.items && typeof order.items === "object"
              ? Object.values(order.items).map((i, idx) => (
                  <div key={idx}>
                    {i.name} x{i.quantity || 1}
                  </div>
                ))
              : order.items}
          </div>
          <p className="mt-2 font-semibold">₦{(order.total_price / 100).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Payment: {order.payment_method}</p>
        </div>

        {type === "pending" && (
          <button onClick={onAction} className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium">
            Accept
          </button>
        )}
        {type === "accepted" && (
          <button onClick={onAction} className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium">
            Mark Ready
          </button>
        )}
        {type === "ready" && (
          <div className="flex flex-col gap-2">
            <div className="text-center font-mono text-sm bg-gray-100 p-1 rounded">
              Code: {order.pickup_code}
            </div>
            <input
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border rounded px-2 py-1 text-sm w-28"
            />
            <button onClick={() => onComplete(code)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">
              Complete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}