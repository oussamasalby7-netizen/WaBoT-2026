import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { normalizeResponse } from "../utils/normalize";

const defaultStats = {
  total_users: 0,
  active_pro_subscribers: 0,
  pending_subscribers: 0,
  expired_subscribers: 0,
  paid_users: 0,
  unpaid_users: 0,
  monthly_revenue: 0,
  total_revenue_all_time: 0,
  failed_payments_recent: 0,
  revenue_by_month: [],
  subscription_breakdown: { active: 0, pending: 0, expired: 0 },
  churn_rate_percent: 0,
  churned_users_last_30d: 0,
  user_growth_trend: "flat",
  user_growth_percent: 0,
  new_users_this_month: 0,
  new_users_last_month: 0,
};

export const useAdminAnalytics = () => {
  const { data: saasStats, isLoading: isLoadingSaaSStats, error: saasStatsError } = useQuery({
    queryKey: ["admin", "saas-stats"],
    queryFn: async () => {
      const response = await api.get("/admin/saas-stats");
      return normalizeResponse(response);
    },
    refetchInterval: 15000,
  });

  return {
    saasStats: { ...defaultStats, ...(saasStats || {}) },
    isLoadingSaaSStats,
    saasStatsError,
  };
};
