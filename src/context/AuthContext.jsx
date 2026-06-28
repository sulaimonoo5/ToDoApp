import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("session_id");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const signIn = async (email, password, remember) => {
    const data = await api.login({ email, password, remember });
    localStorage.setItem("access_token", data.token);
    localStorage.setItem("session_id", data.sessionId);
    if (remember) localStorage.setItem("remember_me", "true");
    else localStorage.removeItem("remember_me");
    setUser(data.user);
  };

  const signUp = async (name, email, password) => {
    const data = await api.register({ name, email, password });
    localStorage.setItem("access_token", data.token);
    localStorage.setItem("session_id", data.sessionId);
    setUser(data.user);
  };

  const signOut = async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("session_id");
    localStorage.removeItem("remember_me");
    setUser(null);
  };

  const updateUser = (updated) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
