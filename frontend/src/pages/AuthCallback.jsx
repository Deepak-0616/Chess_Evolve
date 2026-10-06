import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../contexts/AuthContext';
import { apiClient, setAuthToken } from '../api/client';
import { formatAuthError } from '../utils/authUtils';

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const handleCallback = async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase client is not available.');
        }

        // Check if there is an error parameter in the URL query or hash
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const authError = urlParams.get('error_description') || hashParams.get('error_description') || urlParams.get('error');

        if (authError) {
          throw new Error(authError);
        }

        // If authorization code is present in query parameters (PKCE flow)
        const code = urlParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // Retrieve the current authenticated session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          // Wait briefly for onAuthStateChange to capture tokens if hash fragments are being parsed
          await new Promise((resolve) => setTimeout(resolve, 800));
          const retry = await supabase.auth.getSession();
          if (!retry.data.session) {
            throw new Error('No active session found after Google OAuth.');
          }
        }

        const activeSession = (await supabase.auth.getSession()).data.session;
        if (!activeSession) {
          throw new Error('Authentication session could not be established.');
        }

        // Configure API client authorization header
        setAuthToken(activeSession.access_token);

        // Synchronize with backend API to ensure User record exists and display name is initialized
        const syncResponse = await apiClient.post('/auth/sync');

        if (isMounted) {
          if (syncResponse.data?.hasChessProfile) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/connect', { replace: true });
          }
        }
      } catch (err) {
        console.error('OAuth callback processing error:', err);
        if (isMounted) {
          setError(formatAuthError(err, 'google'));
        }
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
        <div className="max-w-md w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold font-display text-[#F5F0E0]">
            Authentication Incomplete
          </h2>
          <p className="text-xs text-[#A0A0A0] leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="py-2.5 px-6 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
                color: '#080808',
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
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080808' }}>
      <div className="text-center space-y-4">
        <Loader2 size={36} className="animate-spin mx-auto text-[#D4AF37]" />
        <h2 className="text-base font-bold font-display text-[#F5F0E0]">
          Completing Secure Authentication...
        </h2>
        <p className="text-xs text-[#6B6B6B]">
          Connecting your Google profile to Chess Evolve
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
