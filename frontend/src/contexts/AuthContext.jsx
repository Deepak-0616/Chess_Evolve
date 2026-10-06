import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiClient, setAuthToken } from '../api/client';
import { validateDisplayName, validateEmail, validatePassword } from '../utils/authUtils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
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
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncUserProfile = async () => {
    try {
      const res = await apiClient.post('/auth/sync');
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
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
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
