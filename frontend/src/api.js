import axios from "axios";

const api = axios.create({
  baseURL: "/api",   // ✅ FIXED
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

const SESSION_EXPIRED_FLAG = "sessionExpired";

function sessionExpired(response) {
  const status = response.status;
  if (status === 401) return true;
  if (status !== 403) return false;
  const data = response.data || {};
  const msg = String(data.message || data.error || "");
  return /token/i.test(msg);
}

api.interceptors.response.use(
  response => response,
  error => {
    const res = error.response;
    const url = error.config?.url || "";
    const isLoginRequest = url.includes("/auth/login");

    if (res && sessionExpired(res) && !isLoginRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("permissions");
      if (window.location.pathname !== "/") {
        sessionStorage.setItem(SESSION_EXPIRED_FLAG, "1");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// ── Cross-tab session sync ──
// The token lives in one shared localStorage key. When another tab logs in
// with a *different* account (or logs out), this tab's session is gone —
// restart it at the login screen instead of silently continuing as the new user.
function decodeTokenId(token) {
  try {
    const json = atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).id;
  } catch {
    return undefined; // undecidable → let server-side revocation handle it
  }
}

window.addEventListener("storage", (event) => {
  if (event.key !== "token") return;

  // Logged out in another tab → follow.
  if (!event.newValue) {
    if (window.location.pathname !== "/") window.location.href = "/";
    return;
  }

  // Different account logged in on this browser → this session is destroyed.
  const prevId = decodeTokenId(event.oldValue);
  const nextId = decodeTokenId(event.newValue);
  if (prevId !== undefined && nextId !== undefined && prevId !== nextId) {
    sessionStorage.setItem(SESSION_EXPIRED_FLAG, "1");
    if (window.location.pathname !== "/") window.location.href = "/";
    else window.location.reload();
  }
});

export default api;
