import { Bell, Search, Clock } from "lucide-react";

export default function Header({ vendor }) {
  const getStatusBadge = () => {
    if (vendor.is_accepting_orders) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          ● Accepting orders
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        ⏸ Paused
      </span>
    );
  };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Hello, {vendor.business_name}</h2>
            <div className="flex items-center gap-2 mt-1">{getStatusBadge()}</div>
          </div>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search orders, menu items..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={16} />
            <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-100 transition">
            <Bell size={20} className="text-gray-500" />
          </button>
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-semibold">
            {vendor.business_name?.charAt(0) || "V"}
          </div>
        </div>
      </div>
    </header>
  );
}