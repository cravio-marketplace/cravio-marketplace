import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import toast from "react-hot-toast";
import API from "../api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import StatsCards from "../components/StatsCards";
import OrdersFeed from "../components/OrdersFeed";
import ActivityLog from "../components/ActivityLog";
import PopularItems from "../components/PopularItems";
import MenuTable from "../components/MenuTable";
import AnalyticsView from "../components/AnalyticsView";
import SettingsView from "../components/SettingsView";
import SupportView from "../components/SupportView";
import CategoriesManager from "../components/CategoriesManager";
import FeaturedManager from "../components/FeaturedManager";
import ProfileView from './ProfileView';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Dashboard({ vendor, setVendor }) {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [activeView, setActiveView] = useState("orders");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, revenue: 0, pending: 0 });

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      if (res.data.success) setOrders(res.data.orders);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMenu = async () => {
    try {
      const res = await API.get("/menu");
      if (res.data.success) setMenu(res.data.menu);
    } catch (error) {
      console.error(error);
    }
  };

  const calculateStats = () => {
    const total = orders.length;
    const revenue = orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + (o.total_price || 0), 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    setStats({ totalOrders: total, revenue: revenue / 100, pending });
  };

  useEffect(() => {
    fetchOrders();
    fetchMenu();
    setLoading(false);

    const subscription = supabase
      .channel("orders-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `vendor_id=eq.${vendor.id}`,
        },
        () => fetchOrders()
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [vendor.id]);

  useEffect(() => {
    calculateStats();
  }, [orders]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-[#F8F9FB]">
      <Sidebar activeView={activeView} setActiveView={setActiveView} vendor={vendor} setVendor={setVendor} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header vendor={vendor} setVendor={setVendor} />
        <main className="flex-1 overflow-y-auto p-6">
          {activeView === "orders" && (
            <div className="space-y-6">
              <StatsCards stats={stats} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrdersFeed orders={orders} fetchOrders={fetchOrders} />
                <ActivityLog orders={orders} />
              </div>
              <PopularItems orders={orders} menu={menu} />
            </div>
          )}
          {activeView === "menu" && <MenuTable menu={menu} fetchMenu={fetchMenu} />}
          {activeView === "analytics" && <AnalyticsView orders={orders} menu={menu} />}
          {activeView === "categories" && <CategoriesManager />}
          {activeView === "featured" && <FeaturedManager menu={menu} />}
          {activeView === "support" && <SupportView vendor={vendor} />}
          {activeView === "settings" && <SettingsView vendor={vendor} setVendor={setVendor} />}
          {activeView === 'profile' && <ProfileView vendor={vendor} setVendor={setVendor} />}
        </main>
      </div>
    </div>
  );
}