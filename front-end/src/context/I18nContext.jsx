import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { getToken } from "../services/api";
import { messages } from "../locales";

const I18nContext = createContext(null);

const STORAGE_KEY = "wabot-locale";
const SUPPORTED = ["fr", "en", "ar"];

function readStoredLocale() {
  const v = localStorage.getItem(STORAGE_KEY);
  return SUPPORTED.includes(v) ? v : "fr";
}

function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

export function I18nProvider({ children }) {
  const queryClient = useQueryClient();
  const [locale, setLocaleState] = useState(() => readStoredLocale());

  const setLocale = useCallback(async (next, { syncRemote = true } = {}) => {
    const value = SUPPORTED.includes(next) ? next : "fr";
    localStorage.setItem(STORAGE_KEY, value);
    setLocaleState(value);
    document.documentElement.lang = value;
    document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
    if (syncRemote && getToken()) {
      try {
        await api.patch("/user/preferences", { locale: value });
        await queryClient.invalidateQueries({ queryKey: ["user"] });
      } catch {
        /* keep local choice */
      }
    }
  }, [queryClient]);

  const t = useCallback(
    (key, params) => {
      const fromCurrent = getByPath(messages[locale], key);
      const raw = fromCurrent !== undefined ? fromCurrent : getByPath(messages.fr, key);
      const value = raw !== undefined ? raw : key;

      if (!params || typeof value !== "string") {
        return value;
      }

      return Object.keys(params).reduce((acc, k) => {
        const v = params[k];
        return acc
          .replaceAll(`{{${k}}}`, String(v))
          .replaceAll(`{${k}}`, String(v));
      }, value);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      supportedLocales: SUPPORTED,
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
