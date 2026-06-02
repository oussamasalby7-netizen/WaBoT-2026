import { Link, Navigate } from "react-router-dom";
import { CreditCard, LogOut, ArrowRight, LayoutDashboard, MessageCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../context/I18nContext.jsx";
import { userHasActiveProAccess } from "../utils/subscription.js";
import Button from "../components/ui/Button";
import "../styles/auth.css";

/** Admin WhatsApp number – set VITE_ADMIN_WHATSAPP in your .env (digits only, no +). */
const ADMIN_WA_NUMBER =
  import.meta.env.VITE_ADMIN_WHATSAPP || "212600000000";

export default function BillingRequired() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useI18n();

  if (isAdmin) return <Navigate to="/admin" replace />;

  const hasActiveAccess = userHasActiveProAccess(user);
  const state = user?.subscriptionState || "pending";

  return (
    <div className="auth-page">
      <div className="auth-bg-blob top-left" />
      <div className="auth-bg-blob bottom-right" />

      <div className="auth-container billing-container">
        <div className="billing-icon">
          <CreditCard size={28} />
        </div>

        <h1 className="billing-title">{t("billing.title")}</h1>
        <p className="billing-subtitle">{t("billing.subtitle")}</p>

        <div className="billing-status-card">
          <p>
            <span className="billing-status-label">{t("billing.status")}: </span>
            <span className={`billing-status-value billing-state-${state}`}>{user?.subscriptionState || "—"}</span>
          </p>
          {user?.paymentFailedAt && (
            <p className="billing-warning">{t("billing.paymentIssue")}</p>
          )}
        </div>

        <p className="billing-hint">{t("billing.hint")}</p>

        {/* Upgrade / contact CTA based on subscription state */}
        {hasActiveAccess ? (
          <Link to="/dashboard" className="btn btn-primary billing-upgrade-btn">
            <LayoutDashboard size={16} className="btn-icon" />
            {t("billing.goToDashboard")}
            <ArrowRight size={16} className="btn-icon" />
          </Link>
        ) : (
          <>
            <a
              href={`https://wa.me/${ADMIN_WA_NUMBER}?text=${encodeURIComponent(
                t("billing.whatsappMessage")
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp billing-upgrade-btn"
              id="billing-whatsapp-cta"
            >
              {/* WhatsApp green icon */}
              <MessageCircle size={18} className="btn-icon" />
              {t("billing.contactWhatsApp")}
            </a>
            <p className="billing-whatsapp-hint">{t("billing.whatsappHint")}</p>
          </>
        )}

        <div className="billing-actions">
          <Button variant="secondary" onClick={() => logout()}>
            <LogOut className="btn-icon" />
            {t("nav.logout")}
          </Button>
          <Link to="/login" className="btn btn-secondary">
            {t("billing.backLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
