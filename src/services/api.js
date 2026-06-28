const API_URL = import.meta.env.VITE_API_URL || "";

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

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
    body: JSON.stringify({ name, email, password }),
  });
}

export function login({ email, password }) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
