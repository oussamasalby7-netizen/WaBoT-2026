import { useMemo } from "react";

import { 
  Zap, 
  Target, 
  ShoppingBag,
  Sparkles
} from "lucide-react";
import StatCard from "./StatCard";
import MiniTrendChart from "./MiniTrendChart";
import Skeleton from "./ui/Skeleton";
import { useI18n } from "../context/I18nContext.jsx";
import "../styles/dashboard.css";



export default function AIInsights({ orders, isLoading }) { // NOSONAR
  const { t } = useI18n();
  const insights = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    const mockChatCount = Math.round(orders.length * 2.4);
    const conversionRate = ((orders.length / mockChatCount) * 100).toFixed(1);

    const productCounts = orders.reduce((acc, order) => {
      acc[order.productName] = (acc[order.productName] || 0) + 1;
      return acc;
    }, {});
    const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    const successRate = 84; 

    return [
      {
        title: t("dashboard.convRate"),
        value: `${conversionRate}%`,
        icon: Target,
        description: t("dashboard.convRateDesc"),
        color: "primary",
        trend: { value: 2.4, isUp: true },
        chartColor: "#00ff88"
      },
      {
        title: t("dashboard.topProduct"),
        value: topProduct,
        icon: ShoppingBag,
        description: t("dashboard.topProductDesc"),
        color: "secondary",
        chartColor: "#00ddeb"
      },
      {
        title: t("dashboard.aiPerformance"),
        value: `${successRate}%`,
        icon: Zap,
        description: t("dashboard.aiPerformanceDesc"),
        color: "warning",
        trend: { value: 5.2, isUp: true },
        chartColor: "#fbbf24"
      }
    ];
  }, [orders, t]);

  if (isLoading) {
    return (
      <div className="stats-grid">
        {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: '176px', borderRadius: '24px' }} />)}
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <section style={{ margin: "48px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div className="stat-icon-wrapper primary">
          <Sparkles size={24} />
        </div>
        <h3 className="dashboard-title" style={{ margin: 0 }}>{t("dashboard.aiInsights")}</h3>
      </div>

      <div className="stats-grid">
        {insights?.map((insight) => (
          <StatCard 
            key={insight.title} 
            {...insight}
          >
            <MiniTrendChart color={insight.chartColor} />
          </StatCard>
        ))}
      </div>
    </section>
  );
}

