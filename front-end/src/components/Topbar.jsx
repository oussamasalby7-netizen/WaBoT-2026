import { Menu, User, Sun, Moon, Languages } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../context/I18nContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Topbar({ onMenuClick }) { // NOSONAR
  const { user, isAdmin } = useAuth();
  const { t, locale, setLocale, supportedLocales } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          onClick={onMenuClick}
          className="mobile-menu-btn"
        >
          <Menu size={24} />
        </button>
        <h1 className="topbar-title">
          {isAdmin ? (
            <>
              <span className="highlight">{t("topbar.saasAdmin")}</span>
              <span className="subtitle">{t("topbar.adminSubtitle")}</span>
            </>
          ) : (
            <>
              {t("topbar.welcome")}, <span className="highlight">{user?.name || "User"}</span>
            </>
          )}
        </h1>
      </div>

      <div className="topbar-right">
        <div className="language-selector">
          <Languages size={16} />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            aria-label="Language"
          >
            {supportedLocales.map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => toggleTheme()}
          className="topbar-action-btn"
          title={theme === "light" ? "Dark mode" : "Light mode"}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <Link to="/settings" className="user-profile">
          <div className="user-info">
            <p className="user-name">{user?.name || "—"}</p>
            <p className="user-role">
              {user?.email} — {user?.role}
            </p>
          </div>
          <div className="user-avatar">
            <User size={24} />
          </div>
        </Link>
      </div>
    </header>
  );
}
