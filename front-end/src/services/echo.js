import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getToken } from "./api";

globalThis.Pusher = Pusher;
Pusher.logToConsole = import.meta.env.DEV;

const isDev = import.meta.env.DEV;

const PRODUCTION_API_URL = "https://wabot-2026-production.up.railway.app/api";
const PRODUCTION_PUSHER_HOST = "wabot-2026-production.up.railway.app";

const apiUrl = import.meta.env.VITE_API_URL || (isDev ? "http://127.0.0.1:8000/api" : PRODUCTION_API_URL);
const pusherScheme = import.meta.env.VITE_PUSHER_SCHEME || (isDev ? "http" : "https");
const pusherPort = Number(
  import.meta.env.VITE_PUSHER_PORT || (pusherScheme === "https" ? 443 : 6001)
);
const pusherHost =
  import.meta.env.VITE_PUSHER_HOST || (isDev ? "127.0.0.1" : PRODUCTION_PUSHER_HOST);
const forceTLS = pusherScheme === "https";

const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_APP_KEY || "wabot-key-local",
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1",
  wsHost: pusherHost,
  wsPort: pusherPort,
  wssPort: pusherPort,
  forceTLS,
  encrypted: forceTLS,
  enableStats: false,
  enabledTransports: forceTLS ? ["wss"] : ["ws", "wss"],
  authEndpoint: apiUrl.replace(/\/+$/, "") + "/broadcasting/auth",
  auth: {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
  },
});

export const updateEchoToken = (token) => {
  if (echo.connector.options.auth.headers) {
    echo.connector.options.auth.headers.Authorization = `Bearer ${token}`;
  }
};

export default echo;
