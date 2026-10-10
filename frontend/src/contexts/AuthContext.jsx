import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiClient, setAuthToken } from '../api/client';
import { validateDisplayName, validateEmail, validatePassword } from '../utils/authUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const PROFILE_STORAGE_KEY = 'chess_evolve_profile_cache';

const getInitialProfile = () => {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  chessProfile: null,
  profileLoading: false,
  refreshChessProfile: async () => {},
  updateLocalChessProfile: () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  syncUserProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chessProfile, setChessProfile] = useState(getInitialProfile);
  const [profileLoading, setProfileLoading] = useState(false);

  const refreshChessProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const res = await apiClient.get('/chess/profile', { skipCache: true });
      const p = res.data?.chessProfile || res.data?.data || res.data?.profile || res.data;
      if (p && typeof p === 'object' && p.chessUsername) {
        setChessProfile(p);
        try {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p));
        } catch {}
        return p;
      }
    } catch {
      // Fallback: query /profile
      try {
        const profRes = await apiClient.get('/profile', { skipCache: true });
        const prof = profRes.data?.profile || profRes.data?.data;
        if (prof?.chessUsername) {
          const formatted = {
            chessUsername: prof.chessUsername,
            avatarUrl: prof.avatarUrl,
            rating: prof.peakRating,
            totalGames: prof.totalGames,
            ...prof,
          };
          setChessProfile(formatted);
          try {
            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(formatted));
          } catch {}
          return formatted;
        }
      } catch {}
    } finally {
      setProfileLoading(false);
    }
    return null;
  }, []);

  const updateLocalChessProfile = useCallback((updated) => {
    setChessProfile((prev) => {
      const merged = updated ? { ...(prev || {}), ...updated } : null;
      try {
        if (merged) {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(merged));
        } else {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      } catch {}
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase credentials missing. Please check your .env file.');
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setUser(session.user);
          setAuthToken(session.access_token);
          // Refresh profile in background while instant cache is already in state
          refreshChessProfile();
        }
      } catch (err) {
        console.warn('Error reading Supabase session:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      setAuthToken(newSession?.access_token || null);
      setLoading(false);
      if (newSession) {
        refreshChessProfile();
      } else {
        setChessProfile(null);
        try {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        } catch {}
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshChessProfile]);

  const syncUserProfile = async () => {
    try {
      const res = await apiClient.post('/auth/sync');
      await refreshChessProfile();
      return res.data;
    } catch (err) {
      console.warn('Backend sync notification:', err.message);
      return null;
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return data;
  };

  const signInWithEmail = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const emailVal = validateEmail(email);
    if (!emailVal.valid) throw new Error(emailVal.error);
    const passVal = validatePassword(password);
    if (!passVal.valid) throw new Error(passVal.error);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailVal.value,
      password: passVal.value,
    });
    if (error) throw error;

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setAuthToken(data.session.access_token);
      await syncUserProfile();
      await refreshChessProfile();
    }
    return data;
  };

  const signUpWithEmail = async (email, password, displayName) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    const nameVal = validateDisplayName(displayName);
    if (!nameVal.valid) throw new Error(nameVal.error);
    const emailVal = validateEmail(email);
    if (!emailVal.valid) throw new Error(emailVal.error);
    const passVal = validatePassword(password);
    if (!passVal.valid) throw new Error(passVal.error);

    const { data, error } = await supabase.auth.signUp({
      email: emailVal.value,
      password: passVal.value,
      options: {
        data: {
          display_name: nameVal.value,
          full_name: nameVal.value,
        },
      },
    });
    if (error) throw error;

    if (data.session) {
      setSession(data.session);
      setUser(data.user);
      setAuthToken(data.session.access_token);
      await syncUserProfile();
      await refreshChessProfile();
    }

    return {
      user: data.user,
      session: data.session,
      requiresEmailConfirmation: !data.session && !!data.user,
    };
  };

  const signOut = async () => {
    try {
      if (apiClient.defaults.headers.common['Authorization']) {
        await apiClient.post('/auth/logout').catch(() => {});
      }
    } catch {}
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setChessProfile(null);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {}
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        chessProfile,
        profileLoading,
        refreshChessProfile,
        updateLocalChessProfile,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        syncUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
