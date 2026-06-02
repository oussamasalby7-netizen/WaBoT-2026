import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getToken } from "./api";

window.Pusher = Pusher;
Pusher.logToConsole = import.meta.env.DEV;

const pusherScheme = import.meta.env.VITE_PUSHER_SCHEME || "http";
const pusherPort = Number(import.meta.env.VITE_PUSHER_PORT || 6001);
const forceTLS = pusherScheme === "https";

const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_APP_KEY || "wabot-key-local",
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || "mt1",
  wsHost: import.meta.env.VITE_PUSHER_HOST || "127.0.0.1",
  wsPort: pusherPort,
  wssPort: pusherPort,
  forceTLS,
  encrypted: forceTLS,
  enableStats: false,
  enabledTransports: forceTLS ? ["wss"] : ["ws"],
  authEndpoint: (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "") + "/broadcasting/auth",
  auth: {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
    },
  },
});

// Helper to update the token dynamically when user logs in/out
export const updateEchoToken = (token) => {
  if (echo.connector.options.auth.headers) {
    echo.connector.options.auth.headers.Authorization = `Bearer ${token}`;
  }
};

export default echo;
