import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useI18n } from "../context/I18nContext.jsx";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthShellControls from "../components/AuthShellControls.jsx";
import api from "../services/api";
import "../styles/auth.css";

export default function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await api.post("/forgot-password", { email });
      setIsSent(true);
      toast.success(res.data?.data?.message ?? res.data?.message ?? "Reset link sent!");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Unable to send reset link. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-blob top-left" />
      <div className="auth-bg-blob bottom-right" />
      <AuthShellControls />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="auth-container"
      >
        <div className="auth-header">
          <div className="auth-logo">W</div>
          <h1 className="auth-title">
            {isSent ? t("auth.checkInbox") : t("auth.forgotPasswordTitle")}
          </h1>
          <p className="auth-subtitle">
            {isSent
              ? t("auth.checkInboxDesc")
              : t("auth.forgotPasswordSubtitle")}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-card-bg" />

          {isSent ? (
            /* ── Success state ─────────────────────────────────── */
            <div className="fp-success">
              <div className="fp-success-icon">
                <CheckCircle2 size={36} />
              </div>
              <p className="fp-success-text">
                {t("auth.fpSuccessText", { email })}
              </p>
              <Button
                variant="secondary"
                style={{ width: "100%", marginTop: "16px" }}
                onClick={() => { setIsSent(false); setEmail(""); }}
              >
                  {t("auth.sendAgain")}
              </Button>
            </div>
          ) : (
            /* ── Form state ────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="auth-form">
              <Input
                label={t("auth.email")}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                error={error}
              />

              <Button
                type="submit"
                style={{ width: "100%", marginTop: "4px" }}
                isLoading={isLoading}
              >
                <Mail className="btn-icon" />
                  {t("auth.sendResetLink")}
              </Button>
            </form>
          )}
        </div>

        <p className="auth-footer">
          <Link to="/login" className="auth-link fp-back-link">
            <ArrowLeft size={14} />
            {t("auth.backToLogin")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
