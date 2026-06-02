import { useMemo, useState } from "react";
import {
  ShieldCheck, Search, Users, TrendingUp,
  UserCheck, DollarSign, ArrowUpRight,
  ArrowDownRight, Minus,
} from "lucide-react";

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar,
} from "recharts";
import { Table, THead, TBody, TH, TR, TD } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import Dialog from "../components/ui/Dialog";
import { useAuth } from "../hooks/useAuth";
import { useUsers } from "../hooks/useUsers";
import { useAdminAnalytics } from "../hooks/useAdminAnalytics";
import { useI18n } from "../context/I18nContext.jsx";
import "../styles/admin.css";

const CHART_GRID_STROKE = "rgba(148,163,184,0.2)";
const CHART_TICK_FILL = "rgba(148,163,184,0.9)";
const CHART_TOOLTIP_STYLE = {
  background: "rgba(17,24,39,0.95)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 12,
  color: "white",
};

function fmtDate(iso, locale = "en") {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch { return "—"; }
}

function monthKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key) {
  const [y, m] = String(key).split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

export default function Admin() {
  const { t, locale } = useI18n();
  const { user: currentUser } = useAuth();
  const { saasStats, isLoadingSaaSStats } = useAdminAnalytics();
  const {
    users = [], isLoading, updateSubscription, isUpdatingSubscription, toggleBlock, isTogglingBlock,
  } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingUserId, setPendingUserId] = useState(null);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    user: null,
    action: null,
    type: "activate", // activate | extend | block | unblock
  });

  const revenueSeries = useMemo(() => {
    const rows = Array.isArray(saasStats?.revenue_by_month) ? saasStats.revenue_by_month : [];
    return rows.map((r) => ({ month: r.month, revenue: Number(r.revenue || 0) }));
  }, [saasStats]);

  const newUsersByMonth = useMemo(() => {
    const now = new Date();
    const keys = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      if (key) keys.push(key);
    }
    const counts = keys.reduce((acc, k) => { acc[k] = 0; return acc; }, {});
    for (const u of users || []) {
      const k = monthKey(u?.createdAt);
      if (k && counts[k] !== undefined) counts[k] += 1;
    }
    return keys.map((k) => ({ month: monthLabelFromKey(k), newUsers: counts[k] || 0 }));
  }, [users]);

  const userSnapshotBars = useMemo(() => {
    const breakdown = saasStats?.subscription_breakdown || { active: 0, expired: 0, pending: 0 };
    return [
      { label: t("admin.charts.activeUsers"), value: Number(breakdown.active || 0) },
      { label: t("admin.charts.expiredUsers"), value: Number(breakdown.expired || 0) },
      { label: t("admin.charts.newUsersThisMonth"), value: Number(saasStats?.new_users_this_month || 0) },
    ];
  }, [saasStats, t]);

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    return (
      (user.name || "").toLowerCase().includes(q) ||
      (user.email || "").toLowerCase().includes(q) ||
      (user.role || "").toLowerCase().includes(q) ||
      String(user.credits ?? "").includes(q) ||
      (user.subscriptionState || "").toLowerCase().includes(q) ||
      (user.subscriptionStatus || "").toLowerCase().includes(q)
    );
  });

  const openConfirmModal = (user, type) => {
    let action;
    if (type === "activate" || type === "extend") {
      action = () => updateSubscription({ id: user.id, subscription_state: "active" });
    } else if (type === "block" || type === "unblock") {
      action = () => toggleBlock(user.id);
    }

    setConfirmModal({
      isOpen: true,
      user,
      type,
      action,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const runConfirmedAction = async () => {
    if (!confirmModal.user || !confirmModal.action) return;
    setPendingUserId(confirmModal.user.id);
    try {
      await confirmModal.action();
      closeConfirmModal();
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="admin-page">
      {/* HEADER */}
      <div className="admin-page-header">
        <div className="admin-header-icon">
          <ShieldCheck size={26} />
        </div>
        <div>
          <h2 className="admin-header-title">{t("admin.title")}</h2>
          <p className="admin-header-subtitle">{t("admin.subtitle")}</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="admin-charts-grid">
        <div className="admin-chart-panel">
          <h3>{t("admin.charts.revenueTitle")}</h3>
          <p>{t("admin.charts.revenueSubtitle")}</p>
          <div className="admin-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueSeries}>
                <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} />
                <YAxis tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} width={40} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [Number(v).toFixed(2), t("admin.charts.revenue")]} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-charts-right">
          <div className="admin-chart-panel">
            <h3>{t("admin.charts.snapshotTitle")}</h3>
            <p>{t("admin.charts.snapshotSubtitle")}</p>
            <div className="admin-chart-area sm">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userSnapshotBars} layout="vertical" margin={{ left: 24, right: 10 }}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 4" />
                  <XAxis type="number" tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} />
                  <YAxis type="category" dataKey="label" tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} width={140} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#60a5fa" radius={[10, 10, 10, 10]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-chart-panel">
            <h3>{t("admin.charts.newUsersTitle")}</h3>
            <p>{t("admin.charts.newUsersSubtitle")}</p>
            <div className="admin-chart-area sm">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={newUsersByMonth}>
                  <CartesianGrid stroke={CHART_GRID_STROKE} strokeDasharray="4 4" />
                  <XAxis dataKey="month" tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} />
                  <YAxis tick={{ fill: CHART_TICK_FILL, fontSize: 12 }} width={40} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [Number(v), t("admin.charts.users")]} />
                  <Bar dataKey="newUsers" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="admin-kpi-grid">
        {[
          { label: t("admin.kpi.totalUsers"),           icon: <Users size={18} />,       value: isLoadingSaaSStats ? "—" : saasStats.total_users },
          { label: t("admin.kpi.activeSubscriptions"),  icon: <UserCheck size={18} />,   value: isLoadingSaaSStats ? "—" : saasStats.active_pro_subscribers },
          { label: t("admin.kpi.earningsThisMonth"),    icon: <DollarSign size={18} />,  value: isLoadingSaaSStats ? "—" : Number(saasStats.monthly_revenue || 0).toFixed(2) },
        ].map((kpi) => (
          <div key={kpi.label} className="admin-kpi-card">
            <div className="admin-kpi-top">
              <span className="admin-kpi-label">{kpi.label}</span>
              <span className="admin-kpi-icon">{kpi.icon}</span>
            </div>
            <div className="admin-kpi-value">{kpi.value}</div>
          </div>
        ))}

        <div className="admin-kpi-card">
          <div className="admin-kpi-top">
            <span className="admin-kpi-label">{t("admin.kpi.monthlyOverview")}</span>
            <span className="admin-kpi-icon"><TrendingUp size={18} /></span>
          </div>
          <div className="admin-kpi-sub">
            <strong>{isLoadingSaaSStats ? "—" : `${saasStats.new_users_this_month}`}</strong>{" "}
            <span style={{ color: "var(--text-muted)" }}>{t("admin.kpi.newUsers")}</span>
          </div>
          <div className="admin-kpi-trend">
            {saasStats.user_growth_trend === "up" ? (
              <ArrowUpRight size={16} style={{ color: "var(--success)" }} />
            ) : saasStats.user_growth_trend === "down" ? (
              <ArrowDownRight size={16} style={{ color: "var(--danger)" }} />
            ) : (
              <Minus size={16} />
            )}
            <span>{isLoadingSaaSStats ? "—" : `${saasStats.user_growth_percent}%`}</span>
          </div>
        </div>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <Search className="admin-search-icon" />
          <input
            type="text"
            placeholder={t("admin.users.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-search-input"
          />
        </div>
        <div className="admin-toolbar-divider" />
        <div className="admin-count">
          {t("admin.charts.users")}: <strong>{filteredUsers.length}</strong> / {users.length}
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="admin-section">
        <div className="admin-section-header">
          <h3>{t("admin.users.title")}</h3>
          <p>{t("admin.users.subtitle")}</p>
        </div>

        {isLoading ? (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} style={{ height: "52px", borderRadius: "var(--radius-sm)" }} />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={28} /></div>
            <h3>{t("common.noResults")}</h3>
            <p>{t("common.tryOtherSearch")}</p>
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("admin.users.email")}</TH>
                <TH>{t("admin.users.business")}</TH>
                <TH>{t("admin.users.role")}</TH>
                <TH>{t("admin.users.subscription")}</TH>
                <TH>{t("admin.users.periodEnd")}</TH>
                <TH>{t("admin.users.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {filteredUsers.map((user) => {
                const isSubPending = pendingUserId === user.id && (isUpdatingSubscription || isTogglingBlock);
                const isCurrentUser = currentUser?.id === user.id;
                const state = user.subscriptionState;

                return (
                  <TR key={user.id} className={user.isBlocked ? "user-blocked-row" : ""}>
                    <TD>
                      <a href={`mailto:${user.email}`} className="admin-table-clickable-email">
                        {user.email}
                      </a>
                      {isCurrentUser && <div style={{ fontSize: 12, color: "var(--primary)", marginTop: 2 }}>{t("common.you")}</div>}
                    </TD>
                    <TD>
                      <div style={{ fontWeight: 500 }}>{user.business?.name || "—"}</div>
                    </TD>
                    <TD>
                      <Badge variant={user.role === "admin" ? "warning" : "neutral"}>{user.role}</Badge>
                    </TD>
                    <TD>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                          <Badge variant={state === "active" ? "success" : state === "expired" ? "warning" : "neutral"}>
                            {state === "active" ? t("admin.users.stateActive") : state === "expired" ? t("admin.users.stateExpired") : t("admin.users.statePending")}
                          </Badge>
                          {user.isBlocked && <Badge variant="error">{t("admin.users.blocked")}</Badge>}
                        </div>
                        <Button
                          variant={state === "active" ? "secondary" : "primary"}
                          style={{ padding: "5px 12px", fontSize: "12px" }}
                          disabled={isSubPending || user.isBlocked}
                          isLoading={isSubPending && pendingUserId === user.id && !isTogglingBlock}
                          onClick={() => openConfirmModal(user, state === "active" ? "extend" : "activate")}
                        >
                          {state === "active" ? t("admin.users.extend30d") : t("admin.users.activate30d")}
                        </Button>
                      </div>
                    </TD>
                    <TD>
                      <span style={{ whiteSpace: "normal" }}>{fmtDate(user.subscriptionPeriodEnd, locale === "ar" ? "ar-EG" : locale)}</span>
                    </TD>
                    <TD>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <Button
                          variant={user.isBlocked ? "primary" : "secondary"}
                          style={{ padding: "5px 12px", fontSize: "12px", borderColor: user.isBlocked ? "" : "var(--error-color)", color: user.isBlocked ? "" : "var(--error-color)" }}
                          disabled={isSubPending || isCurrentUser}
                          onClick={() => openConfirmModal(user, user.isBlocked ? "unblock" : "block")}
                        >
                          {user.isBlocked ? t("admin.users.unblock") : t("admin.users.block")}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={runConfirmedAction}
        title={
          confirmModal.type === "block" ? t("admin.users.confirmBlockTitle") :
          confirmModal.type === "unblock" ? t("admin.users.confirmUnblockTitle") :
          confirmModal.type === "activate" ? t("admin.users.confirmActivateTitle") :
          t("admin.users.confirmExtendTitle")
        }
        description={
          (confirmModal.type === "block" ? t("admin.users.confirmBlockDesc") :
           confirmModal.type === "unblock" ? t("admin.users.confirmUnblockDesc") :
           confirmModal.type === "activate" ? t("admin.users.confirmActivateDesc") :
           t("admin.users.confirmExtendDesc")).replace("{{email}}", confirmModal.user?.email || "")
        }
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        variant={confirmModal.type === "block" ? "warning" : "primary"}
        isLoading={isUpdatingSubscription || isTogglingBlock}
      />
    </div>
  );
}
