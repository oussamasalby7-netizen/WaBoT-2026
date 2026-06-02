import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useI18n } from "../context/I18nContext.jsx";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthShellControls from "../components/AuthShellControls.jsx";
import api from "../services/api";
import "../styles/auth.css";

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [form, setForm] = useState({
    email: emailFromUrl,
    password: "",
    password_confirmation: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Guard: if no token in URL, show an error immediately
  const isMissingToken = !token;

  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setGlobalError("");

    if (form.password !== form.password_confirmation) {
      setFormErrors({ password_confirmation: [t("settings.passwordsDoNotMatch")] });
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/reset-password", {
        token,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      setIsSuccess(true);
      toast.success(res.data?.data?.message ?? res.data?.message ?? t("auth.passwordUpdated"));

      // Redirect to login after 2.5 s
      setTimeout(() => navigate("/login", { replace: true }), 2500);
    } catch (err) {
      const errors = err.response?.data?.errors || {};
      const msg =
        err.response?.data?.message ||
        "Failed to reset password. The link may have expired.";
      setFormErrors(errors);
      setGlobalError(msg);
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
            {isSuccess ? t("auth.passwordUpdated") : t("auth.resetPasswordTitle")}
          </h1>
          <p className="auth-subtitle">
            {isSuccess
              ? t("auth.redirecting")
              : t("auth.resetPasswordSubtitle")}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-card-bg" />

          {/* ── Invalid / missing token state ──────────────────── */}
          {isMissingToken && (
            <div className="rp-error-state">
              <AlertCircle size={36} className="rp-error-icon" />
              <p className="rp-error-text">
                {t("auth.invalidToken")}
                <br />
                {t("auth.requestNewLink")}
              </p>
              <Link to="/forgot-password" className="btn btn-primary rp-retry-btn">
                {t("auth.requestNewButton")}
              </Link>
            </div>
          )}

          {/* ── Success state ───────────────────────────────────── */}
          {!isMissingToken && isSuccess && (
            <div className="fp-success">
              <div className="fp-success-icon">
                <CheckCircle2 size={36} />
              </div>
              <p className="fp-success-text">
                {t("auth.passwordResetSuccess")}
              </p>
              <Link
                to="/login"
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {t("auth.backToLogin")}
              </Link>
            </div>
          )}

          {/* ── Form state ─────────────────────────────────────── */}
          {!isMissingToken && !isSuccess && (
            <form onSubmit={handleSubmit} className="auth-form">
              <Input
                label={t("auth.email")}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                error={formErrors.email?.[0]}
              />

              <Input
                label={t("settings.newPassword")}
                type="password"
                placeholder={t("settings.atLeast8")}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                error={formErrors.password?.[0]}
              />

              <Input
                label={t("settings.confirmNewPassword")}
                type="password"
                placeholder={t("settings.repeatPassword")}
                value={form.password_confirmation}
                onChange={(e) => updateField("password_confirmation", e.target.value)}
                required
                error={formErrors.password_confirmation?.[0] || globalError}
              />

              <Button
                type="submit"
                style={{ width: "100%", marginTop: "4px" }}
                isLoading={isLoading}
              >
                <Lock className="btn-icon" />
                {t("auth.submitReset")}
              </Button>
            </form>
          )}
        </div>

        {!isSuccess && (
          <p className="auth-footer">
            {t("auth.remembered")}{" "}
            <Link to="/login" className="auth-link">
              {t("auth.backToLogin")}
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
