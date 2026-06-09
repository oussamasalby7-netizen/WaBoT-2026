import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../context/I18nContext";
import { useTheme } from "../context/ThemeContext";

/**
 * After profile loads, align locale/theme with the server without PATCHing back.
 */
export default function UserPreferenceSync() {
  const { user, token } = useAuth();
  const { setLocale } = useI18n();
  const { setTheme } = useTheme();
  const appliedRef = useRef(null);

  useEffect(() => {
    if (!token) {
      appliedRef.current = null;
      return;
    }
    if (!user) {
      return;
    }

    const key = `${user.id}-${user.locale}-${user.themePreference}`;
    if (appliedRef.current === key) {
      return;
    }
    appliedRef.current = key;

    if (user.locale && ["fr", "en", "ar"].includes(user.locale)) {
      setLocale(user.locale, { syncRemote: false });
    }
    if (user.themePreference && ["dark", "light"].includes(user.themePreference)) {
      setTheme(user.themePreference, { syncRemote: false });
    }
  }, [token, user, setLocale, setTheme]);

  return null;
}
