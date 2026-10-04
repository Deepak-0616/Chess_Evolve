import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiClient, setAuthToken } from '../api/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInAsGuestDev: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setAuthToken(session.access_token);
      } else {
        // Fallback local session for dev testing when Supabase credentials aren't live yet
        const localDevToken = localStorage.getItem('chess_evolve_dev_token');
        if (localDevToken) {
          setAuthToken(localDevToken);
          setUser({ id: 'dev_user_123', email: 'player@chess.local', user_metadata: { full_name: 'Chess Player' } });
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setAuthToken(session.access_token);
      } else {
        const localDevToken = localStorage.getItem('chess_evolve_dev_token');
        if (!localDevToken) {
          setSession(null);
          setUser(null);
          setAuthToken(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/connect`,
      },
    });
    if (error) {
      console.error('Google Sign-In Error:', error.message);
      // Fallback to guest dev authentication for local testing
      await signInAsGuestDev();
    }
  };

  const signInAsGuestDev = async () => {
    const dummyToken = 'dev_bearer_token_' + Date.now();
    localStorage.setItem('chess_evolve_dev_token', dummyToken);
    setAuthToken(dummyToken);
    setUser({ id: 'dev_user_' + Date.now(), email: 'player@chess.local', user_metadata: { full_name: 'Chess Player' } });
    setLoading(false);
  };

  const signOut = async () => {
    localStorage.removeItem('chess_evolve_dev_token');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInAsGuestDev, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
