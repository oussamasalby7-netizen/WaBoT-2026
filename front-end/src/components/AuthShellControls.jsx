import { Sun, Moon, Languages } from "lucide-react";
import { useI18n } from "../context/I18nContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import "../styles/auth.css";

/** Compact language + theme controls for auth pages (no dashboard shell). */
export default function AuthShellControls() {
  const { locale, setLocale, supportedLocales } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="auth-controls">
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
        className="theme-toggle"
        aria-label="Toggle theme"
      >
        {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      </button>
    </div>
  );
}
