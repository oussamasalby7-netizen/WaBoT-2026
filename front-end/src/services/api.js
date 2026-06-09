import axios from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

let unauthorizedHandler = null;

export const getToken = () => localStorage.getItem("token");

export const setToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }

  localStorage.removeItem("wabot_token");
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const rawData = error.response?.data;
    const data = rawData?.data ?? rawData;

    if (status === 401) {
      setToken(null);
      if (unauthorizedHandler) {
        unauthorizedHandler();
      } else if (globalThis.location.pathname !== "/login") {
        globalThis.location.href = "/login";
      }
    }

    if (status === 403 && data?.code === "subscription_required") {
      if (globalThis.location.pathname !== "/billing-required" && globalThis.location.pathname !== "/login") {
        globalThis.location.href = "/billing-required";
      }
    }

    if (status === 422) {
      const errors = data?.errors || {};
      const firstError = Object.values(errors)[0]?.[0];
      error.validationErrors = errors;
      error.validationMessage = firstError || data?.message || "Please check the form and try again.";
    }

    if (status >= 500) {
      toast.error(data?.message || "Server error. Please try again.");
    }

    return Promise.reject(error);
  }
);

export default api;
