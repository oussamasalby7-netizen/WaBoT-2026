import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../context/I18nContext.jsx";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthShellControls from "../components/AuthShellControls.jsx";
import "../styles/auth.css";

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError] = useState("");
  const { login, isLoggingIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    setFormError("");

    try {
      await login({ email, password });
      toast.success(t("auth.welcomeToast"));
    } catch (err) {
      setFormErrors(err.validationErrors || {});
      const apiMsg = err.response?.data?.message || err.validationMessage;
      setFormError(apiMsg ? t(apiMsg) : t("auth.loginError"));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-blob top-left"></div>
      <div className="auth-bg-blob bottom-right"></div>
      <AuthShellControls />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="auth-container"
      >
        <div className="auth-header">
          <div className="auth-logo">W</div>
          <h1 className="auth-title">{t("auth.welcomeBack")}</h1>
          <p className="auth-subtitle">{t("auth.signInSubtitle")}</p>
        </div>

        <div className="auth-card">
          <div className="auth-card-bg"></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label={t("auth.email")}
              type="email"
              placeholder="admin@wabot.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              error={formErrors.email?.[0]}
            />

            <div className="input-wrapper">
              <Input
                label={t("auth.password")}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                error={formErrors.password?.[0] || formError}
              />
              <div className="forgot-password-row">
                <Link to="/forgot-password" className="auth-link forgot-password-link">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
            </div>

            <Button type="submit" style={{ width: '100%', marginTop: '8px' }} isLoading={isLoggingIn}>
              <LogIn className="btn-icon" />
              {t("auth.signIn")}
            </Button>
          </form>
        </div>

        <p className="auth-footer">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="auth-link">
            {t("auth.createAccount")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
