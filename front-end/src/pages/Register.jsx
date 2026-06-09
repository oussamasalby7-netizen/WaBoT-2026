import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { useI18n } from "../context/I18nContext.jsx";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthShellControls from "../components/AuthShellControls.jsx";
import api from "../services/api";
import { isValidPassword } from "../utils/passwordUtils";
import "../styles/auth.css";

export default function Register() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const updateFormField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    
    // ReDoS-safe password validation — see src/utils/passwordUtils.js
    if (!isValidPassword(formData.password)) {
      setFormErrors({ password: [t("auth.passwordPolicy")] });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Initiate OTP flow — does NOT create the user yet
      await api.post("/register/initiate", formData);

      toast.success(t("auth.otpSentToast"));

      // Step 2: Navigate to OTP verification page, passing email via query string
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      const validationErrors = err.response?.data?.errors || {};
      const message =
        err.validationMessage ||
        err.response?.data?.message ||
        t("auth.registerError");

      setFormErrors(validationErrors);
      if (!Object.keys(validationErrors).length) {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
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
          <h1 className="auth-title">{t("auth.registerTitle")}</h1>
          <p className="auth-subtitle">{t("auth.registerSubtitle")}</p>
        </div>

        <div className="auth-card">
          <div className="auth-card-bg"></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <Input
              label={t("auth.name")}
              value={formData.name}
              onChange={(e) => updateFormField("name", e.target.value)}
              required
              error={formErrors.name?.[0]}
            />

            <Input
              label={t("auth.email")}
              type="email"
              value={formData.email}
              onChange={(e) => updateFormField("email", e.target.value)}
              required
              error={formErrors.email?.[0]}
            />

            <Input
              label={t("auth.password")}
              type="password"
              value={formData.password}
              onChange={(e) => updateFormField("password", e.target.value)}
              required
              error={formErrors.password?.[0]}
            />

            <Input
              label={t("auth.confirmPassword")}
              type="password"
              value={formData.password_confirmation}
              onChange={(e) =>
                updateFormField("password_confirmation", e.target.value)
              }
              required
              error={formErrors.password_confirmation?.[0]}
            />

            <Button
              type="submit"
              style={{ width: "100%", marginTop: "8px" }}
              isLoading={isLoading}
            >
              <UserPlus className="btn-icon" />
              {t("auth.submitRegister")}
            </Button>
          </form>
        </div>

        <p className="auth-footer">
          {t("auth.hasAccount")}{" "}
          <Link to="/login" className="auth-link">
            {t("auth.signInLink")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
