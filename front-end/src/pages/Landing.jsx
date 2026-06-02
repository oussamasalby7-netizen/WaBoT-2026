import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext.jsx";
import { useAuth } from "../hooks/useAuth";
import "../styles/landing.css";
import heroImage from "../assets/herobackground.png";

export default function Landing() {
  const { t, locale, setLocale, supportedLocales } = useI18n();
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-page">
      {/* Navbar */}
      <header className={`landing-nav ${isScrolled ? "scrolled" : ""}`}>
        <div className="landing-container nav-container">
          <div className="nav-logo">
            <span className="logo-icon">W</span>
            <span className="logo-text">WaBOT</span>
          </div>

          {/* Desktop Nav */}
          <nav className="nav-desktop">
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
              <Link to="/dashboard" className="btn-solid">
                {t("landing.dashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">
                  {t("landing.login")}
                </Link>
                <Link to="/register" className="btn-solid">
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
            <span className={`bar ${isMobileMenuOpen ? "open" : ""}`}></span>
            <span className={`bar ${isMobileMenuOpen ? "open" : ""}`}></span>
            <span className={`bar ${isMobileMenuOpen ? "open" : ""}`}></span>
          </button>
        </div>

        {/* Mobile Nav */}
        <div className={`nav-mobile ${isMobileMenuOpen ? "open" : ""}`}>
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

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-background-gradient"></div>
        <div className="landing-container hero-container">
          <div className="hero-content">
            <span className="hero-badge">{t("landing.heroBadge")}</span>
            <h1 className="hero-title">{t("landing.heroTitle")}</h1>
            <p className="hero-subtitle">
              {t("landing.heroSubtitle")}
            </p>
            <div className="hero-buttons">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn-solid btn-large">
                  {t("landing.goDashboard")}
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-solid btn-large">
                    {t("landing.startFree")}
                  </Link>
                  <Link to="/login" className="btn-outline btn-large">
                    {t("landing.login")}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-visual">
            <div className="image-wrapper">
              <div className="image-glow"></div>
              <img 
                src={heroImage} 
                alt="WaBOT AI Dashboard showing automation" 
                className="hero-image floating-animation"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
