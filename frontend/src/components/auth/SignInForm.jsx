import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GoogleButton from './GoogleButton';
import { formatAuthError } from '../../utils/authUtils';

export const SignInForm = ({ onToggleMode, onSuccess }) => {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const isBusy = emailLoading || googleLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBusy) return;

    setError('');
    setEmailLoading(true);

    try {
      await signInWithEmail(email, password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(formatAuthError(err, 'login'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isBusy) return;

    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      // Google redirect handled by Supabase OAuth
    } catch (err) {
      setError(formatAuthError(err, 'google'));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            aria-label="Email Address"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isBusy}
            required
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#F5F0E0] placeholder-[#555555] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        <div className="relative">
          <input
            id="signin-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isBusy}
            required
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl pl-4 pr-11 py-3 text-sm text-[#F5F0E0] placeholder-[#555555] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isBusy}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#D4AF37] focus:outline-none transition-colors p-1 cursor-pointer"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/20 text-red-400 text-xs text-left animate-fadeIn"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy || !email || !password}
          className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-lg disabled:cursor-not-allowed"
          style={{
            background:
              isBusy || !email || !password
                ? '#1A1A1A'
                : 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
            color: isBusy || !email || !password ? '#4A4A4A' : '#080808',
          }}
        >
          {emailLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Signing In...</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Visual Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#1F1F1F]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-[#0A0A0A] px-3 text-[#4A4A4A] font-semibold">
            OR
          </span>
        </div>
      </div>

      {/* Google OAuth Button */}
      <GoogleButton
        onClick={handleGoogleSignIn}
        loading={googleLoading}
        disabled={isBusy}
      />

      {/* Navigation to Sign Up */}
      <div className="mt-4 text-center text-xs text-[#6B6B6B]">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          disabled={isBusy}
          className="text-[#D4AF37] hover:text-[#F0C040] font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default SignInForm;
