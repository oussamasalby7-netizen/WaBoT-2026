import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "./hooks/useAuth";
import { useTheme } from "./context/ThemeContext.jsx";
import { userHasActiveProAccess } from "./utils/subscription.js";
import DashboardLayout from "./layouts/DashboardLayout";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Landing = lazy(() => import("./pages/Landing"));
const BillingRequired = lazy(() => import("./pages/BillingRequired"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Orders = lazy(() => import("./pages/Orders"));
const Products = lazy(() => import("./pages/Products"));
const Chats = lazy(() => import("./pages/Chats"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const SupportMessages = lazy(() => import("./pages/SupportMessages"));
const TestLab = lazy(() => import("./pages/TestLab"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));

function AppLoader() {
  return (
    <div className="app-loader">
      <div className="app-loader-spinner" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AppLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function SaaSOnlyRoute({ children }) {
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();

  if (isLoading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!userHasActiveProAccess(user)) return <Navigate to="/billing-required" replace />;

  return children;
}

/** Regular SaaS customer app: dashboard, settings, etc. Admins use /admin only. */
function UserAppRoute({ children }) {
  const { isAuthenticated, isAdmin, isLoading, user } = useAuth();
  if (isLoading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!userHasActiveProAccess(user)) return <Navigate to="/billing-required" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const { theme } = useTheme();
  const homePath = isAdmin ? "/admin" : "/dashboard";
  const isTestMode = import.meta.env.VITE_TEST_MODE === "true";

  if (isLoading) {
    return <AppLoader />;
  }

  return (
    <>
      <Toaster position="top-right" theme={theme === "light" ? "light" : "dark"} richColors />
      <Suspense fallback={<AppLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to={homePath} replace />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to={homePath} replace />} />
          <Route path="/signup" element={!isAuthenticated ? <Register /> : <Navigate to={homePath} replace />} />

          {/* ── Feature: Forgot / Reset Password ─────────────────────────── */}
          <Route
            path="/forgot-password"
            element={!isAuthenticated ? <ForgotPassword /> : <Navigate to={homePath} replace />}
          />
          <Route
            path="/reset-password"
            element={!isAuthenticated ? <ResetPassword /> : <Navigate to={homePath} replace />}
          />

          {/* ── Feature: OTP Email Verification ──────────────────────────── */}
          <Route path="/verify-email" element={<VerifyOtp />} />

          <Route
            path="/billing-required"
            element={
              <ProtectedRoute>
                <BillingRequired />
              </ProtectedRoute>
            }
          />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<UserAppRoute><Dashboard /></UserAppRoute>} />
            <Route path="/orders" element={<SaaSOnlyRoute><Orders /></SaaSOnlyRoute>} />
            <Route path="/products" element={<SaaSOnlyRoute><Products /></SaaSOnlyRoute>} />
            <Route path="/chats" element={<SaaSOnlyRoute><Chats /></SaaSOnlyRoute>} />
            <Route path="/settings" element={<UserAppRoute><Settings /></UserAppRoute>} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/messages" element={<AdminRoute><SupportMessages /></AdminRoute>} />
            {isTestMode && <Route path="/test-lab" element={<UserAppRoute><TestLab /></UserAppRoute>} />}
          </Route>

          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
