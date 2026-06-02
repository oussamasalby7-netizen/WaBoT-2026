import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { Table, THead, TBody, TH, TR, TD } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { useSupportMessages } from "../hooks/useSupportMessages";
import { useI18n } from "../context/I18nContext.jsx";
import "../styles/admin.css";

function fmtDate(iso, locale = "en") {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale, { 
      year: "numeric", 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch { return "—"; }
}

export default function SupportMessages() {
  const { t, language } = useI18n();
  const {
    messages = [],
    isLoading,
    updateSupportMessage,
    isUpdating,
  } = useSupportMessages();
  const [pendingId, setPendingId] = useState(null);

  // Auto-mark all as read when entering page
  useEffect(() => {
    const unread = messages.filter(m => !m.is_read);
    if (!isLoading && unread.length > 0) {
      unread.forEach(m => {
        updateSupportMessage({ id: m.id, is_read: true });
      });
    }
  }, [messages, isLoading, updateSupportMessage]);

  const handleAction = async (id, action) => {
    setPendingId(id);
    try { await action(); } finally { setPendingId(null); }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-header-icon">
          <MessageSquare size={26} />
        </div>
        <div>
          <h2 className="admin-header-title">{t("admin.support.title")}</h2>
          <p className="admin-header-subtitle">{t("admin.support.subtitle")}</p>
        </div>
      </div>

      <div className="admin-section">
        {isLoading ? (
          <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} style={{ height: "64px", borderRadius: "12px" }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><MessageSquare size={28} /></div>
            <p>{t("admin.support.noMessages")}</p>
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("admin.support.colEmail")}</TH>
                <TH>{t("admin.support.colPhone")}</TH>
                <TH>{t("admin.support.colMessage")}</TH>
                <TH>{t("admin.support.colDate")}</TH>
                <TH>{t("admin.support.colStatus")}</TH>
              </TR>
            </THead>
            <TBody>
              {messages.map((m) => {
                const isPending = pendingId === m.id && isUpdating;
                return (
                  <TR key={m.id}>
                    <TD>
                      <a href={`mailto:${m.email}`} className="admin-table-clickable-email">
                        {m.email}
                      </a>
                    </TD>
                    <TD>{m.phone || "—"}</TD>
                    <TD>
                      <div className="admin-table-text-long" style={{ maxWidth: "400px", fontSize: 13, lineHeight: 1.5 }}>
                        {m.message}
                      </div>
                    </TD>
                    <TD>{fmtDate(m.created_at || m.createdAt, language === "ar" ? "ar-EG" : language)}</TD>
                    <TD>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <Badge variant={m.is_read ? "success" : "neutral"}>
                            {m.is_read ? t("admin.support.statusRead") : t("admin.support.statusUnread")}
                          </Badge>
                          <Badge variant={m.is_replied ? "primary" : "warning"}>
                            {m.is_replied ? t("admin.support.statusReplied") : t("admin.support.statusUnreplied")}
                          </Badge>
                        </div>
                        
                        <div style={{ display: "flex", gap: "6px" }}>
                          <Button
                            variant="secondary"
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                            disabled={isPending}
                            isLoading={isPending}
                            onClick={() => handleAction(m.id, () => updateSupportMessage({ id: m.id, is_read: !m.is_read }))}
                          >
                            {m.is_read ? t("admin.support.markUnread") : t("admin.support.markRead")}
                          </Button>
                          <Button
                            variant={m.is_replied ? "secondary" : "primary"}
                            style={{ padding: "4px 10px", fontSize: "11px" }}
                            disabled={isPending}
                            isLoading={isPending}
                            onClick={() => handleAction(m.id, () => updateSupportMessage({ id: m.id, is_replied: !m.is_replied }))}
                          >
                            {m.is_replied ? t("admin.support.markUnreplied") : t("admin.support.markReplied")}
                          </Button>
                        </div>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
