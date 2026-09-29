import React, { createContext, useContext, useState, useEffect } from "react";
import { ApiClient } from "../services/api.js";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("chess_evolve_token"));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const userData = await ApiClient.getMe();
      setUser(userData);
    } catch (err) {
      console.warn("Failed to restore auth session:", err);
      localStorage.removeItem("chess_evolve_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (email, pass) => {
    const res = await ApiClient.login({ email, password: pass });
    localStorage.setItem("chess_evolve_token", res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (email, pass, displayName) => {
    const res = await ApiClient.register({ email, password: pass, displayName });
    localStorage.setItem("chess_evolve_token", res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem("chess_evolve_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
