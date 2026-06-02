import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { I18nProvider } from "./context/I18nContext.jsx";
import { EchoProvider } from "./context/EchoContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";

(function initShellFromStorage() {
  const root = document.documentElement;
  const theme = localStorage.getItem("wabot-theme") === "light" ? "light" : "dark";
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  const loc = localStorage.getItem("wabot-locale");
  const locale = ["fr", "en", "ar"].includes(loc) ? loc : "fr";
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <BrowserRouter>
            <AuthProvider>
              <EchoProvider>
                <ErrorBoundary>
                  <App />
                </ErrorBoundary>
              </EchoProvider>
            </AuthProvider>
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
