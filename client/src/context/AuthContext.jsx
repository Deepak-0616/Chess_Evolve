import React, { createContext, useContext, useState, useEffect } from "react";
import { ApiClient } from "../services/api.js";
import { supabase } from "../services/supabase.js";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("chess_evolve_token"));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const activeToken = localStorage.getItem("chess_evolve_token");
      if (!activeToken) {
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
    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.access_token) {
        localStorage.setItem("chess_evolve_token", session.access_token);
        setToken(session.access_token);
      }
    });

    refreshUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [token]);

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  };

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

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem("chess_evolve_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
