import { getDeviceInfo } from "../utils/deviceInfo";

const API_URL = import.meta.env.VITE_API_URL || "";

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");
  const sessionId = localStorage.getItem("session_id");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (sessionId) headers["X-Session-Id"] = sessionId;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export function register({ name, email, password }) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, deviceInfo: getDeviceInfo() }),
  });
}

export function login({ email, password, remember }) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, deviceInfo: getDeviceInfo() }),
  });
}

export function getMe() {
  return request("/api/auth/me");
}

export function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export function changePassword({ currentPassword, newPassword }) {
  return request("/api/auth/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function deleteAccount({ password }) {
  return request("/api/auth/account", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}

export function updateProfile({ name }) {
  return request("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function getSessions() {
  return request("/api/auth/sessions");
}

export function deleteSession(sessionId) {
  return request(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
}

export function logoutAllSessions() {
  return request("/api/auth/sessions/logout-all", { method: "POST" });
}

export function getLoginHistory(limit = 50) {
  return request(`/api/auth/login-history?limit=${limit}`);
}

export function getSecurity() {
  return request("/api/auth/security");
}
