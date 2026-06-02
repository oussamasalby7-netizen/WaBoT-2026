import { useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  ShoppingBag, 
  MessageSquare, 
  DollarSign,
  TrendingUp,
  ArrowUpRight
} from "lucide-react";
import StatCard from "../components/StatCard";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useOrders } from "../hooks/useOrders";
import { useChats } from "../hooks/useChats";
import Skeleton from "../components/ui/Skeleton";
import AIInsights from "../components/AIInsights";
import { useI18n } from "../context/I18nContext.jsx";
import "../styles/dashboard.css";

export default function Dashboard() {
  const { t, locale } = useI18n();
  const { orders, isLoading: isLoadingOrders } = useOrders();
  const { conversations, isLoading: isLoadingChats } = useChats();
  const totalRevenue = orders?.reduce((acc, order) => acc + order.totalPrice, 0) || 0;
  const completedOrders = orders?.filter((order) => order.status === "completed").length || 0;
  const avgOrderValue = orders?.length ? totalRevenue / orders.length : 0;
  
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toDateString(),
        name: date.toLocaleDateString(locale === "ar" ? "ar-MA" : locale === "fr" ? "fr-FR" : "en-US", { weekday: "short" }),
        revenue: 0,
        orders: 0,
      };
    });

    orders?.forEach((order) => {
      const day = days.find((item) => item.key === new Date(order.createdAt).toDateString());
      if (day) {
        day.revenue += order.totalPrice;
        day.orders += 1;
      }
    });

    return days;
  }, [orders, locale]);

  const stats = [
    { 
      title: t("dashboard.revenue"), 
      value: `$${totalRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      trend: { value: 12, isUp: true },
      color: "primary",
      description: t("dashboard.revenueDesc")
    },
    { 
      title: t("dashboard.totalOrders"), 
      value: orders?.length || "0", 
      icon: ShoppingBag, 
      trend: { value: 8, isUp: true },
      color: "secondary",
      description: t("dashboard.ordersDesc")
    },
    { 
      title: t("dashboard.activeChats"), 
      value: conversations?.length || "0", 
      icon: MessageSquare, 
      trend: { value: 5, isUp: false },
      color: "warning",
      description: t("dashboard.chatsDesc")
    }
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">{t("dashboard.title")}</h2>
          <p className="dashboard-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <Link to="/orders" className="btn-report">
          <TrendingUp className="icon" />
          {t("dashboard.viewReports")}
        </Link>
      </div>

      <div className="stats-grid">
        {isLoadingOrders || isLoadingChats ? (
          [1, 2, 3].map(i => <Skeleton key={i} style={{ height: '176px', borderRadius: '24px' }} />)
        ) : (
          stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))
        )}
      </div>

      <AIInsights orders={orders} isLoading={isLoadingOrders} />

      <div className="dashboard-grid">
        {/* Revenue Chart */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3 className="panel-title">{t("dashboard.revenueGrowth")}</h3>
            <select className="panel-select">
              <option>{t("dashboard.last7Days")}</option>
              <option>{t("dashboard.last30Days")}</option>
            </select>
          </div>
          
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-elevated)', 
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-main)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#00ff88" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity / Insights */}
        <div className="dashboard-panel" style={{ display: "flex", flexDirection: "column" }}>
          <h3 className="panel-title" style={{ marginBottom: "24px" }}>{t("dashboard.recentInsights")}</h3>
          <div style={{ flex: 1 }}>
            {[
              { label: t("dashboard.completedOrders"), value: completedOrders, color: "primary" },
              { label: t("dashboard.avgOrderValue"), value: `$${avgOrderValue.toFixed(2)}`, color: "secondary" },
              { label: t("dashboard.conversations"), value: conversations?.length || 0, color: "default" },
            ].map((insight, i) => (
              <div key={i} className="insight-item">
                <span className="insight-label">{insight.label}</span>
                <span className={`insight-value ${insight.color}`}>{insight.value}</span>
              </div>
            ))}
          </div>
          
          <Link to="/chats" className="btn-link">
            {t("dashboard.checkAllInsights")}
            <ArrowUpRight className="icon" />
          </Link>
        </div>
      </div>
    </div>
  );
}
