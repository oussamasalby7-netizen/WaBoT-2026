import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useBusiness } from "../hooks/useBusiness";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import {
  Settings as SettingsIcon, Globe, Smartphone, Save,
  CheckCircle2, LifeBuoy, X,
  Wifi, WifiOff, RefreshCw, LogOut
} from "lucide-react";
import { toast } from "sonner";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../context/I18nContext.jsx";
import "../styles/settings.css";

function useWhatsAppConnection(userId) {
  const [status, setStatus] = useState({
    connected: false,
    phoneNumber: null,
    hasQr: false,
    isConnecting: false,
    serviceAvailable: true,
    retryCount: 0,
    lastError: null,
  });
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/whatsapp/${userId}/status`);
      const data = res.data?.data ?? {};
      const serviceAvailable = !data.error;

      setStatus({
        connected: !!data.connected,
        phoneNumber: data.phoneNumber ?? null,
        hasQr: !!data.hasQr,
        isConnecting: !!data.isConnecting,
        serviceAvailable,
        retryCount: data.retryCount ?? 0,
        lastError: data.lastError ?? data.error ?? null,
      });

      if (!data.connected && serviceAvailable) {
        const qrRes = await api.get(`/whatsapp/${userId}/qr`);
        setQrData(qrRes.data?.data?.qr ?? null);
      } else {
        setQrData(null);
      }
    } catch {
      setStatus({
        connected: false,
        phoneNumber: null,
        hasQr: false,
        isConnecting: false,
        serviceAvailable: false,
        retryCount: 0,
        lastError: "Service unreachable",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const timeoutId = window.setTimeout(fetchStatus, 0);
    intervalRef.current = window.setInterval(fetchStatus, 4000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalRef.current);
    };
  }, [fetchStatus, userId]);

  const disconnect = useCallback(async () => {
    if (!userId) return;
    try {
      await api.post(`/whatsapp/${userId}/disconnect`);
      toast.success("WhatsApp disconnected. Scan the new QR code to reconnect.");
      setStatus({
        connected: false,
        phoneNumber: null,
        hasQr: false,
        isConnecting: false,
        serviceAvailable: true,
        retryCount: 0,
        lastError: null,
      });
      setQrData(null);
    } catch {
      toast.error("Failed to disconnect. Is the WhatsApp service running?");
    }
  }, [userId]);

  return { status, qrData, loading, refresh: fetchStatus, disconnect };
}

export default function Settings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { business, updateBusiness, isUpdating } = useBusiness();
  const [draftFormData, setDraftFormData] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);

  const { status: waStatus, qrData, loading: waLoading, refresh: waRefresh, disconnect: waDisconnect } =
    useWhatsAppConnection(user?.id);

  const defaultSupportEmail = useMemo(() => user?.email || "", [user]);
  const [supportForm, setSupportForm] = useState({ email: "", phone: "", message: "" });
  const [accountForm, setAccountForm] = useState({ email: user?.email || "" });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", password: "", password_confirmation: "" });
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const businessFormData = {
    name: business?.name || "",
    description: business?.description || "",
    phone: business?.phone || "",
    whatsapp_phone_number_id: business?.whatsappPhoneNumberId || "",
  };
  const formData = draftFormData ?? businessFormData;

  const waBadgeClass = waStatus.connected
    ? "connected"
    : waLoading || waStatus.isConnecting
    ? "connecting"
    : "disconnected";

  const updateFormField = (field, value) => setDraftFormData({ ...formData, [field]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error(t("settings.businessNameRequired"));
    if (!formData.phone) return toast.error(t("settings.businessPhoneRequired"));
    try {
      await updateBusiness(formData);
      setDraftFormData(null);
    } catch { /* handled by hook */ }
  };

  const openSupport = () => {
    setSupportForm({ email: defaultSupportEmail, phone: business?.phone || "", message: "" });
    setIsSupportOpen(true);
  };

  const submitSupport = async (e) => {
    e.preventDefault();
    if (!supportForm.email) return toast.error(t("settings.supportEmailRequired"));
    if (!supportForm.message || supportForm.message.trim().length < 5) return toast.error(t("settings.supportMessageRequired"));
    setIsSubmittingSupport(true);
    try {
      const res = await api.post("/support/messages", supportForm);
      toast.success(res.data?.data?.message ?? res.data?.message ?? t("settings.supportSuccess"));
      setSupportForm({ email: defaultSupportEmail, phone: business?.phone || "", message: "" });
      setIsSupportOpen(false);
    } catch (err) {
      toast.error(err.validationMessage || err.response?.data?.message || t("settings.supportError"));
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    if (!accountForm.email) return toast.error(t("settings.emailRequired"));
    setIsUpdatingAccount(true);
    try {
      await api.patch("/user/email", { email: accountForm.email });
      toast.success(t("settings.emailUpdated"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("settings.emailUpdateError"));
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.current_password) return toast.error(t("settings.currentPasswordRequired"));
    if (passwordForm.password !== passwordForm.password_confirmation) return toast.error(t("settings.passwordsDoNotMatch"));
    if (passwordForm.password.length < 8) return toast.error(t("settings.passwordTooShort"));

    setIsUpdatingPassword(true);
    try {
      await api.patch("/user/password", passwordForm);
      toast.success(t("settings.passwordUpdated"));
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || t("settings.passwordUpdateError"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="page-header-text">
          <h2>{t("settings.title")}</h2>
          <p>{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="settings-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <form onSubmit={handleSubmit} className="settings-panel">
            <div className="settings-section-header">
              <div className="settings-section-icon primary">
                <SettingsIcon size={20} />
              </div>
              <span className="settings-section-title">{t("settings.general")}</span>
            </div>

            <div className="settings-form-grid">
              <Input
                label={t("settings.businessName")}
                placeholder="WaBoT Store"
                value={formData.name}
                onChange={(e) => updateFormField("name", e.target.value)}
              />
              <Input
                label={t("settings.businessPhone")}
                placeholder="+212 600 000 000"
                value={formData.phone}
                onChange={(e) => updateFormField("phone", e.target.value)}
              />
            </div>

            <div style={{ marginTop: "var(--space-4)" }}>
              <Input
                label={t("settings.description")}
                placeholder={t("settings.descriptionPlaceholder")}
                value={formData.description}
                onChange={(e) => updateFormField("description", e.target.value)}
              />
            </div>

            <div className="settings-divider" />

            <div className="settings-section-header">
              <div className="settings-section-icon secondary">
                <Smartphone size={20} />
              </div>
              <span className="settings-section-title">{t("settings.whatsapp")}</span>
            </div>

            <Button type="submit" isLoading={isUpdating} style={{ minWidth: "160px" }}>
              <Save className="btn-icon" />
              {t("settings.save")}
            </Button>
          </form>

          <div className="settings-panel">
            <div className="settings-section-header">
              <div className="settings-section-icon secondary">
                <Globe size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="settings-section-title">WhatsApp Connection</span>
              </div>
              <span className={`wa-status-badge ${waBadgeClass}`}>
                <span className="wa-pulse-dot" />
                {waStatus.connected ? "Connected" : waLoading || waStatus.isConnecting ? "Connecting..." : "Disconnected"}
              </span>
            </div>

            {waStatus.connected ? (
              <>
                <div className="wa-connected-info">
                  <div className="wa-connected-icon"><Wifi size={26} /></div>
                  <div className="wa-connected-number">+{waStatus.phoneNumber}</div>
                  <div className="wa-connected-label">WhatsApp is active and receiving messages</div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
                  <Button variant="secondary" onClick={waRefresh} style={{ flex: 1 }}>
                    <RefreshCw size={15} style={{ marginRight: 6 }} />
                    Refresh
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={waDisconnect}
                    style={{ flex: 1, color: "var(--error)", borderColor: "var(--error)" }}
                  >
                    <LogOut size={15} style={{ marginRight: 6 }} />
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <div className="qr-card">
                {waLoading && !qrData ? (
                  <div className="qr-waiting">
                    <div className="qr-spinner" />
                    <span>Connecting to WhatsApp service...</span>
                  </div>
                ) : qrData ? (
                  <>
                    <img src={qrData} alt="WhatsApp QR Code" className="qr-image" />
                    <p className="qr-instructions">
                      Open <strong>WhatsApp</strong> on your phone, go to <strong>Appareils connectes</strong>,
                      then scan this QR code.
                    </p>
                  </>
                ) : !waStatus.serviceAvailable ? (
                  <div className="qr-waiting">
                    <WifiOff size={36} style={{ opacity: 0.3 }} />
                    <span>WhatsApp service is not running.</span>
                    <span>Start it with <code>npm start</code> inside <code>whatsapp-service/</code></span>
                  </div>
                ) : (
                  <div className="qr-waiting">
                    <div className="qr-spinner" />
                    <span>Preparing WhatsApp QR code...</span>
                    <span>{waStatus.lastError || "Please wait a few seconds, then refresh."}</span>
                  </div>
                )}
                <Button variant="secondary" onClick={waRefresh} style={{ marginTop: 4 }}>
                  <RefreshCw size={14} style={{ marginRight: 6 }} />
                  Refresh
                </Button>
              </div>
            )}
          </div>

          <div className="settings-panel">
            <div className="settings-section-header">
              <div className="settings-section-icon danger">
                <SettingsIcon size={20} />
              </div>
              <span className="settings-section-title">{t("settings.security")}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
              <form onSubmit={handleAccountSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-4)", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <Input
                    label={t("settings.accountEmail")}
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ email: e.target.value })}
                  />
                </div>
                <Button type="submit" isLoading={isUpdatingAccount} variant="secondary">
                  {t("settings.updateEmail")}
                </Button>
              </form>

              <div className="settings-divider" />

              <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="settings-form-grid">
                  <Input
                    label={t("settings.currentPassword")}
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  />
                  <div />
                </div>
                <div className="settings-form-grid">
                  <Input
                    label={t("settings.newPassword")}
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  />
                  <Input
                    label={t("settings.confirmPassword")}
                    type="password"
                    value={passwordForm.password_confirmation}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                  />
                </div>
                <div>
                  <Button type="submit" isLoading={isUpdatingPassword} variant="secondary">
                    {t("settings.changePassword")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="settings-sidebar">
          <div className="status-card">
            <h4 className="status-card-title">{t("settings.systemStatus")}</h4>
            {[
              { label: t("settings.whatsAppApi"), status: waStatus.connected ? t("settings.statusConnected") : "Pending" },
              { label: t("settings.openAiEngine"), status: t("settings.statusActive") },
              { label: t("settings.database"), status: t("settings.statusSynced") },
            ].map((item) => (
              <div key={item.label} className="status-item">
                <span className="status-label">{item.label}</span>
                <div className="status-indicator">
                  <CheckCircle2 size={16} />
                  {item.status}
                </div>
              </div>
            ))}
          </div>

          <div className="help-card">
            <h4 className="help-card-title">{t("settings.needHelp")}</h4>
            <p>{t("settings.contactSupport")}</p>
            <Button variant="secondary" onClick={openSupport} style={{ width: "100%" }}>
              {t("settings.contactSupport")}
            </Button>
          </div>
        </div>
      </div>

      {isSupportOpen && (
        <div className="support-modal-overlay">
          <div
            className="support-modal-backdrop"
            onClick={() => !isSubmittingSupport && setIsSupportOpen(false)}
          />
          <div className="support-modal-card">
            <button
              type="button"
              onClick={() => setIsSupportOpen(false)}
              disabled={isSubmittingSupport}
              className="support-modal-close"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="support-modal-header">
              <div className="settings-section-icon primary">
                <LifeBuoy size={20} />
              </div>
              <div>
                <h3 className="settings-section-title">{t("settings.supportTitle")}</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{t("settings.supportSubtitle")}</p>
              </div>
            </div>

            <form onSubmit={submitSupport} className="support-form">
              <div className="support-form-grid">
                <Input
                  label={t("auth.email")}
                  placeholder="you@example.com"
                  value={supportForm.email}
                  onChange={(e) => setSupportForm((s) => ({ ...s, email: e.target.value }))}
                />
                <Input
                  label={t("settings.businessPhone")}
                  placeholder="+212 600 000 000"
                  value={supportForm.phone}
                  onChange={(e) => setSupportForm((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>

              <div className="input-wrapper">
                <label className="input-label">{t("settings.message")}</label>
                <textarea
                  rows={5}
                  value={supportForm.message}
                  onChange={(e) => setSupportForm((s) => ({ ...s, message: e.target.value }))}
                  placeholder={t("settings.messagePlaceholder")}
                  className="textarea-field"
                />
              </div>

              <div className="support-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsSupportOpen(false)}
                  disabled={isSubmittingSupport}
                >
                  {t("settings.cancel")}
                </Button>
                <Button type="submit" isLoading={isSubmittingSupport}>
                  {t("settings.send")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
