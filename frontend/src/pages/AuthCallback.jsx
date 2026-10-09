import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../contexts/AuthContext';
import { apiClient, setAuthToken } from '../api/client';
import { formatAuthError } from '../utils/authUtils';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const navigatedRef = React.useRef(false);

  useEffect(() => {
    if (!supabase) {
      setError('Supabase client is not available.');
      return;
    }

    // Check for explicit error returned in URL query or hash from OAuth provider
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const authError =
      urlParams.get('error_description') ||
      hashParams.get('error_description') ||
      urlParams.get('error');

    if (authError) {
      setError(formatAuthError(authError, 'google'));
      return;
    }

    const code = urlParams.get('code');

    const handleSuccess = (session) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;

      // Clean query and hash from URL address bar
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setAuthToken(session.access_token);

      // Trigger backend sync in background without blocking navigation
      apiClient.post('/auth/sync').catch((err) => {
        console.warn('[AuthCallback] Background sync notification:', err?.message || err);
      });

      // Navigate immediately to dashboard
      navigate('/dashboard', { replace: true });
    };

    // 1. Check if session is already present (e.g. from local storage or fast auto-exchange)
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        handleSuccess(data.session);
      }
    }).catch((err) => {
      console.warn('[AuthCallback] getSession check notice:', err);
    });

    // 2. Listen to Supabase auth state change (fires as soon as PKCE exchange finishes in background)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        handleSuccess(session);
      }
    });

    // 3. If authorization code is present in URL, also attempt explicit exchange safely
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error: exchangeErr }) => {
        if (!exchangeErr && data?.session) {
          handleSuccess(data.session);
        }
      }).catch((exchangeErr) => {
        console.warn('[AuthCallback] exchangeCode notice:', exchangeErr?.message || exchangeErr);
      });
    }

    // 4. Fallback timeout: If still not resolved after 4 seconds, verify one last time before showing error
    const timer = setTimeout(async () => {
      if (navigatedRef.current) return;

      try {
        const finalCheck = await supabase.auth.getSession();
        if (finalCheck?.data?.session) {
          handleSuccess(finalCheck.data.session);
          return;
        }
      } catch {}

      if (!navigatedRef.current) {
        setError('Authentication timed out. Please check your connection and try again.');
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#040406' }}>
        <div className="max-w-md w-full bg-[#0B0C12] border border-[#181A24] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold font-display text-[#F3EFE6]">
            Authentication Incomplete
          </h2>
          <p className="text-xs text-[#7E8092] leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await supabase?.auth?.signOut();
                } catch {}
                navigate('/login', { replace: true });
              }}
              className="py-2.5 px-6 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer shadow-lg hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)',
                color: '#040406',
              }}
            >
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#040406' }}>
      <div className="text-center space-y-4">
        <Loader2 size={36} className="animate-spin mx-auto text-[#C5A059]" />
        <h2 className="text-base font-bold font-display text-[#F3EFE6]">
          Completing Secure Authentication...
        </h2>
        <p className="text-xs text-[#7E8092]">
          Connecting your Google profile to Chess Evolve
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
