import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api, { getToken, setToken as persistToken, setUnauthorizedHandler } from "../services/api";
import { normalizeResponse, normalizeUser } from "../utils/normalize";
import UserPreferenceSync from "../components/UserPreferenceSync.jsx";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(() => getToken());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const setAuthToken = useCallback((nextToken) => {
    persistToken(nextToken);
    setTokenState(nextToken);
  }, []);

  const clearSession = useCallback(() => {
    setAuthToken(null);
    queryClient.clear();
  }, [queryClient, setAuthToken]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      if (window.location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    });

    return () => setUnauthorizedHandler(null);
  }, [clearSession, navigate]);

  const { data: user, isPending: isRestoringUser } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get("/user");
      const data = normalizeResponse(response);
      return normalizeUser(data.user ?? data);
    },
    enabled: Boolean(token),
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await api.post("/login", { email, password });
      const data = normalizeResponse(response);
      const accessToken = data.access_token ?? data.token;

      if (!accessToken) {
        throw new Error("Login succeeded but no access token was returned.");
      }

      return {
        token: accessToken,
        user: normalizeUser(data.user),
      };
    },
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["user"], data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ name, email, password, password_confirmation }) => {
      const response = await api.post("/register", {
        name,
        email,
        password,
        password_confirmation,
      });
      const data = normalizeResponse(response);
      return normalizeUser(data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (token) {
        await api.post("/logout");
      }
    },
    onSettled: () => {
      clearSession();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    },
  });

  const logout = () => logoutMutation.mutateAsync();

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
        logout,
        isAuthenticated: Boolean(token && user),
        isAdmin: user?.role === "admin",
        isLoading: Boolean(token && isRestoringUser),
        isLoggingIn: loginMutation.isPending,
        isRegistering: registerMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
      }}
    >
      <UserPreferenceSync />
      {children}
    </AuthContext.Provider>
  );
};

// This file intentionally exports the provider and its paired hook together.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
