import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiClient, setAuthToken } from '../api/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('placeholder')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isDevMode: false,
  signInWithGoogle: async () => {},
  continueAsDemo: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  const bootstrapUser = useCallback(async (userId, email, name, avatarUrl, token) => {
    setAuthToken(token);
    setUser({ id: userId, email, user_metadata: { full_name: name, avatar_url: avatarUrl } });
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Try Supabase real session
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          await bootstrapUser(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.full_name,
            session.user.user_metadata?.avatar_url,
            session.access_token
          );
          setLoading(false);
          return;
        }
      }

      // 2. Try local demo session
      const devSession = localStorage.getItem('chess_evolve_session');
      if (devSession) {
        try {
          const parsed = JSON.parse(devSession);
          await bootstrapUser(parsed.id, parsed.email, parsed.name, null, parsed.token);
          setIsDevMode(true);
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem('chess_evolve_session');
        }
      }

      setLoading(false);
    };

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          setSession(session);
          await bootstrapUser(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.full_name,
            session.user.user_metadata?.avatar_url,
            session.access_token
          );
          setIsDevMode(false);
        } else {
          const devSession = localStorage.getItem('chess_evolve_session');
          if (!devSession) {
            setUser(null);
            setSession(null);
            setAuthToken(null);
          }
        }
        setLoading(false);
      });
      return () => subscription.unsubscribe();
    }
  }, [bootstrapUser]);

  const signInWithGoogle = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/connect` },
      });
      if (error) {
        console.error('Google OAuth error:', error.message);
        await continueAsDemo();
      }
    } else {
      await continueAsDemo();
    }
  };

  const continueAsDemo = async () => {
    const demoId = `demo_${Date.now()}`;
    const token = `demo_token_${demoId}`;
    const session = { id: demoId, email: 'demo@chessevolve.app', name: 'Demo Player', token };
    localStorage.setItem('chess_evolve_session', JSON.stringify(session));
    await bootstrapUser(demoId, session.email, session.name, null, token);
    setIsDevMode(true);
  };

  const signOut = async () => {
    localStorage.removeItem('chess_evolve_session');
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsDevMode(false);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isDevMode, signInWithGoogle, continueAsDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
