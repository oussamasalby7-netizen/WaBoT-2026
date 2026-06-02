import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ShieldCheck, RotateCcw, ArrowLeft } from "lucide-react";
import { useI18n } from "../context/I18nContext.jsx";
import { setToken as persistToken } from "../services/api";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeUser } from "../utils/normalize";
import Button from "../components/ui/Button";
import AuthShellControls from "../components/AuthShellControls.jsx";
import api from "../services/api";
import "../styles/auth.css";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtp() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(null); // attempts remaining
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Redirect to register if no email param
  useEffect(() => {
    if (!emailFromQuery) {
      toast.error(t("auth.sessionExpired") || "Session expired. Please register again.");
      navigate("/register", { replace: true });
    }
  }, [emailFromQuery, navigate, t]);

  const otp = digits.join("");

  const focusInput = (index) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index].focus();
      inputRefs.current[index].select();
    }
  };

  const handleDigitChange = (index, value) => {
    // Accept only digits
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setError("");

    // Auto-advance to next input
    if (clean && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError(t("auth.otpRequired") || "Please enter all 6 digits.");
      return;
    }
    setError("");
    setIsVerifying(true);

    try {
      const res = await api.post("/register/verify", {
        email: emailFromQuery,
        otp,
      });

      const data = res.data?.data;
      const accessToken = data?.access_token;
      const rawUser = data?.user;

      if (accessToken && rawUser) {
        // Auto-login: persist token and hydrate user cache
        persistToken(accessToken);
        queryClient.setQueryData(["user"], normalizeUser(rawUser));
        toast.success(res.data?.data?.message ?? res.data?.message ?? t("auth.accountCreated") ?? "Account created! Welcome to WaBoT!");
        navigate("/dashboard", { replace: true });
      } else {
        toast.success(res.data?.data?.message ?? res.data?.message ?? t("auth.accountCreatedLogin") ?? "Account created! Please log in.");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Try again.";
      const rem = err.response?.data?.remaining;
      setError(msg);
      if (rem !== undefined) setRemaining(rem);

      // Clear digits on wrong code
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => focusInput(0), 50);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError("");
    setDigits(Array(OTP_LENGTH).fill(""));
    setRemaining(null);

    try {
      const res = await api.post("/register/resend", { email: emailFromQuery });
      toast.success(res.data?.data?.message ?? res.data?.message ?? "New code sent!");
      setCooldown(RESEND_COOLDOWN);
      setTimeout(() => focusInput(0), 50);
    } catch (err) {
      const msg = err.response?.data?.message || "Could not resend code.";
      if (err.response?.status === 422) {
        // Session expired — send back to register
        toast.error("Session expired. Please register again.");
        navigate("/register", { replace: true });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsResending(false);
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
          <h1 className="auth-title">{t("auth.verifyEmailTitle")}</h1>
          <p className="auth-subtitle">
            {t("auth.verifyEmailSubtitle", { email: emailFromQuery })}
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-card-bg" />

          <form onSubmit={handleVerify} className="auth-form">
            {/* OTP digit inputs */}
            <div className="otp-inputs-wrapper">
              <div className="otp-inputs" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={(e) => e.target.select()}
                    className={`otp-digit-input ${error ? "error" : ""} ${digit ? "filled" : ""}`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                  />
                ))}
              </div>

              {error && (
                <p className="otp-error-text">
                  {error}
                  {remaining !== null && remaining > 0 && (
                    <span className="otp-attempts"> ({remaining} left)</span>
                  )}
                </p>
              )}
            </div>

            <Button
              type="submit"
              style={{ width: "100%", marginTop: "4px" }}
              isLoading={isVerifying}
              disabled={otp.length < OTP_LENGTH || isVerifying}
            >
              <ShieldCheck className="btn-icon" />
              {t("auth.verifyButton")}
            </Button>

            {/* Resend button */}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="otp-resend-btn"
            >
              <RotateCcw size={14} className="otp-resend-icon" />
              {cooldown > 0
                ? t("auth.resendIn", { seconds: cooldown })
                : isResending
                ? t("auth.resending")
                : t("auth.resendButton")}
            </button>
          </form>
        </div>

        <p className="auth-footer">
          <Link to="/register" className="auth-link fp-back-link">
            <ArrowLeft size={14} />
            {t("auth.backToRegister")}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
