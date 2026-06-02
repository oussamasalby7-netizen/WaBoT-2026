import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { getToken } from "../services/api";

const ThemeContext = createContext(null);

const STORAGE_KEY = "wabot-theme";

function readStoredTheme() {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" ? "light" : "dark";
}

function applyDomTheme(theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme === "light" ? "light" : "dark");
}

export function ThemeProvider({ children }) {
  const queryClient = useQueryClient();
  const [theme, setThemeState] = useState(() => readStoredTheme());

  useEffect(() => {
    applyDomTheme(theme);
  }, [theme]);

  const setTheme = useCallback(async (next, { syncRemote = true } = {}) => {
    const value = next === "light" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, value);
    setThemeState(value);
    applyDomTheme(value);
    if (syncRemote && getToken()) {
      try {
        await api.patch("/user/preferences", { theme_preference: value });
        await queryClient.invalidateQueries({ queryKey: ["user"] });
      } catch {
        /* offline / guest — local preference still applied */
      }
    }
  }, [queryClient]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
