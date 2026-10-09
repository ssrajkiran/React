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

export default api;
