import { useState } from "react";
import { useOrders } from "../hooks/useOrders";
import { Table, THead, TBody, TH, TR, TD } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import Dialog from "../components/ui/Dialog";
import { Search, Filter, CheckCircle2, Clock, XCircle, ShoppingBag } from "lucide-react";
import { useI18n } from "../context/I18nContext.jsx";



export default function Orders() {
  const { t } = useI18n();
  const { orders, isLoading, updateStatus, isUpdating } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState({ open: false, orderId: null, newStatus: null });

  const handleStatusChange = (orderId, newStatus) => {
    const order = orders?.find((item) => item.id === orderId);
    if (order?.status === newStatus) return;
    setConfirmDialog({ open: true, orderId, newStatus });
  };

  const confirmStatusUpdate = async () => {
    try {
      await updateStatus({ id: confirmDialog.orderId, status: confirmDialog.newStatus });
      setConfirmDialog({ open: false, orderId: null, newStatus: null });
    } catch { /* handled by hook */ }
  };

  const filteredOrders = orders?.filter((order) =>
    (
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    ) && (statusFilter === "all" || order.status === statusFilter)
  );

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "completed": return "success";
      case "pending":   return "warning";
      case "cancelled": return "danger";
      default:          return "neutral";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "completed": return <CheckCircle2 size={12} />;
      case "cancelled": return <XCircle size={12} />;
      case "pending":   return <Clock size={12} />;
      default:          return null;
    }
  };

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <div className="page-header-text">
          <h2>{t("orders.title")}</h2>
          <p>{t("orders.subtitle")}</p>
        </div>

        <div className="page-toolbar" style={{ margin: 0 }}>
          <div className="search-box">
            <Search className="search-box-icon" />
            <input
              type="text"
              placeholder={t("orders.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-box-input"
            />
          </div>

          <div className="search-box">
            <Filter className="search-box-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">{t("orders.statusAll")}</option>
              <option value="pending">{t("orders.statusPending")}</option>
              <option value="completed">{t("orders.statusCompleted")}</option>
              <option value="cancelled">{t("orders.statusCancelled")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="panel-card">
        {isLoading ? (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} style={{ height: "56px", borderRadius: "var(--radius-sm)" }} />
            ))}
          </div>
        ) : !filteredOrders || filteredOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ShoppingBag size={28} /></div>
            <h3>{t("orders.noOrders")}</h3>
            <p>{t("orders.noOrdersSubtitle")}</p>
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("orders.colCustomer")}</TH>
                <TH>{t("orders.colProduct")}</TH>
                <TH>{t("orders.colQty")}</TH>
                <TH>{t("orders.colTotal")}</TH>
                <TH>{t("orders.colStatus")}</TH>
                <TH style={{ textAlign: "right" }}>{t("orders.colActions")}</TH>
              </TR>
            </THead>
            <TBody>
              {filteredOrders.map((order) => (
                <TR key={order.id}>
                  <TD>
                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{order.customerName}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{order.customerAddress}</div>
                    <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "2px" }}>{order.customerPhone}</div>
                  </TD>
                  <TD>{order.productName}</TD>
                  <TD>{order.quantity}</TD>
                  <TD style={{ fontWeight: 600, color: "var(--primary)" }}>${order.totalPrice.toFixed(2)}</TD>
                  <TD>
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusIcon(order.status)}
                      {t(`orders.status${order.status.charAt(0).toUpperCase() + order.status.slice(1)}`)}
                    </Badge>
                  </TD>
                  <TD style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="table-select"
                      >
                        <option value="pending">{t("orders.statusPending")}</option>
                        <option value="completed">{t("orders.statusCompleted")}</option>
                        <option value="cancelled">{t("orders.statusCancelled")}</option>
                      </select>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, orderId: null, newStatus: null })}
        onConfirm={confirmStatusUpdate}
        isLoading={isUpdating}
        title={t("orders.updateStatusTitle")}
        description={t("orders.updateStatusDescription", { status: t(`orders.status${confirmDialog.newStatus?.charAt(0).toUpperCase() + confirmDialog.newStatus?.slice(1)}`) })}
        confirmText={t("orders.updateStatusConfirm")}
      />
    </div>
  );
}
