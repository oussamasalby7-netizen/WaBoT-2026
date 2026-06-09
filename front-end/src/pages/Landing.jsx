import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext.jsx";
import { useAuth } from "../hooks/useAuth";
import "../styles/landing.css";
import heroImage from "../assets/herobackground.png";

/* ─── Card scroll-reveal variants ───────────────────────────────────────────────
   Used ONLY for feature cards, use-case cards, and how-it-works steps.
   All other sections are plain, non-animated HTML.
──────────────────────────────────────────────────────────── */

/** Stagger wrapper — staggers children by 0.15s */
const cardContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

/** Card entrance: opacity 0→1, translateY 60px→0, 0.7s easeOut, once */
const cardReveal = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

/** Shared viewport: fire once, trigger just before element is fully visible */
const CARD_VP = { once: true, margin: "-60px" };

/* ─── Icon Components (inline SVG, zero deps) ─── */
function IconBot() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <line x1="12" y1="3" x2="12" y2="7" />
      <circle cx="9" cy="16" r="1" fill="currentColor" />
      <circle cx="15" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}
function IconOrder() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
function IconSales() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
function IconSetup() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconStore() { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>; }
function IconShirt() { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>; }
function IconFood() { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>; }
function IconTruck() { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }
function IconHeadset() { return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>; }
function IconClock() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconMoney() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function IconShield() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IconWhatsApp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

/* ─── Section Tag (reusable label chip) ─── */
function SectionTag({ label }) { // NOSONAR
  return <span className="section-tag">{label}</span>;
}

export default function Landing() {
  const { t, locale, setLocale, supportedLocales } = useI18n();
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    { icon: <IconBot />, titleKey: "feat1Title", descKey: "feat1Desc", color: "green" },
    { icon: <IconOrder />, titleKey: "feat2Title", descKey: "feat2Desc", color: "blue" },
    { icon: <IconSales />, titleKey: "feat3Title", descKey: "feat3Desc", color: "purple" },
    { icon: <IconSetup />, titleKey: "feat4Title", descKey: "feat4Desc", color: "orange" },
  ];

  const useCases = [
    { icon: <IconStore />, titleKey: "uc1Title", descKey: "uc1Desc" },
    { icon: <IconShirt />, titleKey: "uc2Title", descKey: "uc2Desc" },
    { icon: <IconFood />, titleKey: "uc3Title", descKey: "uc3Desc" },
    { icon: <IconTruck />, titleKey: "uc4Title", descKey: "uc4Desc" },
    { icon: <IconHeadset />, titleKey: "uc5Title", descKey: "uc5Desc" },
  ];

  const steps = [
    { stepKey: "how1Step", titleKey: "how1Title", descKey: "how1Desc" },
    { stepKey: "how2Step", titleKey: "how2Title", descKey: "how2Desc" },
    { stepKey: "how3Step", titleKey: "how3Title", descKey: "how3Desc" },
  ];

  const benefits = [
    { icon: <IconClock />, titleKey: "ben1Title", descKey: "ben1Desc" },
    { icon: <IconMoney />, titleKey: "ben2Title", descKey: "ben2Desc" },
    { icon: <IconShield />, titleKey: "ben3Title", descKey: "ben3Desc" },
  ];

  const stats = [
    { valueKey: "stat1Value", labelKey: "stat1Label" },
    { valueKey: "stat2Value", labelKey: "stat2Label" },
    { valueKey: "stat3Value", labelKey: "stat3Label" },
    { valueKey: "stat4Value", labelKey: "stat4Label" },
  ];

  return (
    <div className="landing-page">

      {/* ═══════════════════════════ NAVBAR ═══════════════════════════ */}
      <header className={`landing-nav ${isScrolled ? "scrolled" : ""}`}>
        <div className="landing-container nav-container">
          <div className="nav-logo">
            <span className="logo-icon">W</span>
            <span className="logo-text">WaBoT</span>
          </div>

          {/* Desktop Nav */}
          <nav className="nav-desktop">
            <a href="#features" className="nav-link">Features</a>
            <a href="#use-cases" className="nav-link">Use Cases</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <div className="landing-lang-selector">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="lang-select"
              >
                {supportedLocales.map(loc => (
                  <option key={loc} value={loc}>
                    {loc === "en" ? "English" : loc === "fr" ? "Français" : "العربية"}
                  </option>
                ))}
              </select>
            </div>
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-solid" id="nav-dashboard-btn">
                {t("landing.dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost" id="nav-login-btn">
                  {t("landing.login")}
                </Link>
                <Link to="/register" className="btn-solid" id="nav-signup-btn">
                  {t("landing.signup")}
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="hamburger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`bar ${isMobileMenuOpen ? "open" : ""}`} />
            <span className={`bar ${isMobileMenuOpen ? "open" : ""}`} />
            <span className={`bar ${isMobileMenuOpen ? "open" : ""}`} />
          </button>
        </div>

        {/* Mobile Nav */}
        <div className={`nav-mobile ${isMobileMenuOpen ? "open" : ""}`}>
          <a href="#features" className="nav-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
          <a href="#use-cases" className="nav-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>Use Cases</a>
          <a href="#how-it-works" className="nav-mobile-link" onClick={() => setIsMobileMenuOpen(false)}>How It Works</a>
          <div className="mobile-lang-row">
            {supportedLocales.map(loc => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                className={`lang-pill ${locale === loc ? "active" : ""}`}
              >
                {loc === "en" ? "EN" : loc === "fr" ? "FR" : "AR"}
              </button>
            ))}
          </div>
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-solid">{t("landing.dashboard")}</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost" onClick={() => setIsMobileMenuOpen(false)}>{t("landing.login")}</Link>
              <Link to="/register" className="btn-solid" onClick={() => setIsMobileMenuOpen(false)}>{t("landing.signup")}</Link>
            </>
          )}
        </div>
      </header>

      {/* ═══════════════════════════ HERO ═══════════════════════════ */}
      <main className="hero-section" id="hero">
        <div className="hero-bg-orb hero-bg-orb--1" />
        <div className="hero-bg-orb hero-bg-orb--2" />
        <div className="landing-container hero-container">
          <div className="hero-content">
            <span className="hero-badge">
              <IconWhatsApp />
              {t("landing.heroBadge")}
            </span>
            <h1 className="hero-title">
              {t("landing.heroTitle").split("\n").map((line, i) => {
                const lineKey = `hero-title-${i}`;
                if (i === 0) return <span key={lineKey}>{line}</span>;
                return <span key={lineKey}><br /><span className="hero-title-accent">{line}</span></span>;
              })}
            </h1>
            <p className="hero-subtitle">{t("landing.heroSubtitle")}</p>
            <div className="hero-buttons">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-solid btn-large btn-glow" id="hero-dashboard-btn">
                  {t("landing.goDashboard")} <IconArrow />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-solid btn-large btn-glow" id="hero-get-started-btn">
                    {t("landing.startFree")} <IconArrow />
                  </Link>
                  <Link to="/login" className="btn-outline btn-large" id="hero-login-btn">
                    {t("landing.login")}
                  </Link>
                </>
              )}
            </div>
            <p className="hero-disclaimer">Free to start. No credit card required.</p>
          </div>
          <div className="hero-visual">
            <div className="image-wrapper">
              <div className="image-glow" />
              <img
                src={heroImage}
                alt="WaBoT AI WhatsApp chatbot dashboard showing automation"
                className="hero-image floating-animation"
                width="700"
                height="500"
              />
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════ STATS STRIP ═══════════════════════════ */}
      <section className="stats-section" aria-label="Key statistics">
        <div className="landing-container">
          <div className="stats-grid">
            {stats.map((s) => (
              <div className="stat-item" key={s.valueKey}>
                <div className="stat-value">{t(`landing.${s.valueKey}`)}</div>
                <div className="stat-label">{t(`landing.${s.labelKey}`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FEATURES ═══════════════════════════ */}
      <section className="features-section section-pad" id="features" aria-label="Features">
        <div className="landing-container">
          <div className="section-header">
            <SectionTag label={t("landing.featuresTag")} />
            <h2 className="section-title">{t("landing.featuresTitle")}</h2>
            <p className="section-subtitle">{t("landing.featuresSubtitle")}</p>
          </div>
          <motion.div
            className="features-grid"
            variants={cardContainer}
            initial="hidden"
            whileInView="visible"
            viewport={CARD_VP}
          >
            {features.map((f) => (
              <motion.div
                variants={cardReveal}
                className={`feature-card feature-card--${f.color}`}
                key={f.titleKey}
              >
                <div className={`feature-icon feature-icon--${f.color}`}>{f.icon}</div>
                <h3 className="feature-title">{t(`landing.${f.titleKey}`)}</h3>
                <p className="feature-desc">{t(`landing.${f.descKey}`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ USE CASES ═══════════════════════════ */}
      <section className="usecases-section section-pad" id="use-cases" aria-label="Use cases">
        <div className="landing-container">
          <div className="section-header">
            <SectionTag label={t("landing.usecasesTag")} />
            <h2 className="section-title">{t("landing.usecasesTitle")}</h2>
            <p className="section-subtitle">{t("landing.usecasesSubtitle")}</p>
          </div>
          <motion.div
            className="usecases-grid"
            variants={cardContainer}
            initial="hidden"
            whileInView="visible"
            viewport={CARD_VP}
          >
            {useCases.map((u) => (
              <motion.div
                variants={cardReveal}
                className="usecase-card"
                key={u.titleKey}
              >
                <div className="usecase-icon">{u.icon}</div>
                <h3 className="usecase-title">{t(`landing.${u.titleKey}`)}</h3>
                <p className="usecase-desc">{t(`landing.${u.descKey}`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ HOW IT WORKS ═══════════════════════════ */}
      <section className="how-section section-pad" id="how-it-works" aria-label="How it works">
        <div className="landing-container">
          <div className="section-header">
            <SectionTag label={t("landing.howTag")} />
            <h2 className="section-title">{t("landing.howTitle")}</h2>
            <p className="section-subtitle">{t("landing.howSubtitle")}</p>
          </div>
          <motion.div
            className="how-grid"
            variants={cardContainer}
            initial="hidden"
            whileInView="visible"
            viewport={CARD_VP}
          >
            {steps.map((step) => (
              <motion.div
                variants={cardReveal}
                className="how-step"
                key={step.stepKey}
              >
                <div className="how-step-number">{t(`landing.${step.stepKey}`)}</div>
                <div className="how-step-connector" aria-hidden="true" />
                <div className="how-step-body">
                  <h3 className="how-step-title">{t(`landing.${step.titleKey}`)}</h3>
                  <p className="how-step-desc">{t(`landing.${step.descKey}`)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════ BENEFITS ═══════════════════════════ */}
      <section className="benefits-section section-pad" id="benefits" aria-label="Benefits">
        <div className="landing-container">
          <div className="section-header">
            <SectionTag label={t("landing.benefitsTag")} />
            <h2 className="section-title">{t("landing.benefitsTitle")}</h2>
            <p className="section-subtitle">{t("landing.benefitsSubtitle")}</p>
          </div>
          <div className="benefits-grid">
            {benefits.map((b) => (
              <div className="benefit-card" key={b.titleKey}>
                <div className="benefit-icon">{b.icon}</div>
                <h3 className="benefit-title">{t(`landing.${b.titleKey}`)}</h3>
                <p className="benefit-desc">{t(`landing.${b.descKey}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ BOTTOM CTA ═══════════════════════════ */}
      <section className="cta-section" aria-label="Call to action">
        <div className="cta-bg-orb" />
        <div className="landing-container cta-container">
          <div className="cta-badge">
            <IconWhatsApp />
            Start today
          </div>
          <h2 className="cta-title">{t("landing.ctaTitle")}</h2>
          <p className="cta-subtitle">{t("landing.ctaSubtitle")}</p>
          <div className="cta-buttons">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-solid btn-large btn-glow" id="cta-dashboard-btn">
                {t("landing.goDashboard")} <IconArrow />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-solid btn-large btn-glow" id="cta-get-started-btn">
                  {t("landing.ctaButton")} <IconArrow />
                </Link>
                <Link to="/login" className="cta-login-link" id="cta-login-btn">
                  {t("landing.ctaSecondary")}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FOOTER ═══════════════════════════ */}
      <footer className="landing-footer" role="contentinfo">
        <div className="landing-container footer-container">
          <div className="footer-brand">
            <div className="nav-logo">
              <span className="logo-icon">W</span>
              <span className="logo-text">WaBoT</span>
            </div>
            <p className="footer-tagline">{t("landing.footerTagline")}</p>
          </div>
          <div className="footer-links">
            <Link to="/register" className="footer-link">Get Started</Link>
            <Link to="/login" className="footer-link">Login</Link>
            <a href="#features" className="footer-link">Features</a>
            <a href="#how-it-works" className="footer-link">How It Works</a>
          </div>
          <div className="footer-legal">
            <span className="footer-copy">{t("landing.footerCopy")}</span>
            <div className="footer-legal-links">
              <Link to="/login" className="footer-link footer-link--small">{t("landing.footerPrivacy")}</Link>
              <Link to="/register" className="footer-link footer-link--small">{t("landing.footerTerms")}</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
