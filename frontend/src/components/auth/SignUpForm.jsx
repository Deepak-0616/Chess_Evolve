import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import GoogleButton from './GoogleButton';
import {
  validateDisplayName,
  validateEmail,
  validatePassword,
  formatAuthError,
} from '../../utils/authUtils';

export const SignUpForm = ({ onToggleMode, onSuccess }) => {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  const isBusy = emailLoading || googleLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBusy) return;

    setError('');

    // Field validations
    const nameResult = validateDisplayName(displayName);
    if (!nameResult.valid) {
      setError(nameResult.error);
      return;
    }

    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      setError(emailResult.error);
      return;
    }

    const passResult = validatePassword(password);
    if (!passResult.valid) {
      setError(passResult.error);
      return;
    }

    setEmailLoading(true);

    try {
      const res = await signUpWithEmail(emailResult.value, passResult.value, nameResult.value);
      if (res.requiresEmailConfirmation) {
        setConfirmationNotice(true);
      } else if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(formatAuthError(err, 'signup'));
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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

  if (confirmationNotice) {
    return (
      <div className="w-full text-center space-y-4 py-4 animate-fadeIn">
        <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto text-[#D4AF37]">
          <CheckCircle size={24} />
        </div>
        <h3 className="text-base font-bold text-[#F5F0E0]">Check Your Email</h3>
        <p className="text-xs text-[#A0A0A0] leading-relaxed max-w-xs mx-auto">
          Account created. Please check your email to verify your account and complete registration.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onToggleMode}
            className="text-xs text-[#D4AF37] hover:text-[#F0C040] font-medium transition-colors cursor-pointer"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* 1. Display Name */}
        <div>
          <label
            htmlFor="signup-display-name"
            className="block text-xs font-medium text-[#A0A0A0] mb-1.5 text-left"
          >
            Display Name
          </label>
          <input
            id="signup-display-name"
            type="text"
            autoComplete="name"
            placeholder="Your chess handle or name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isBusy}
            required
            maxLength={50}
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#F5F0E0] placeholder-[#4A4A4A] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* 2. Email Address */}
        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-medium text-[#A0A0A0] mb-1.5 text-left"
          >
            Email Address
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isBusy}
            required
            className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-sm text-[#F5F0E0] placeholder-[#4A4A4A] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>

        {/* 3. Password */}
        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-medium text-[#A0A0A0] mb-1.5 text-left"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isBusy}
              required
              className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl pl-4 pr-11 py-3 text-sm text-[#F5F0E0] placeholder-[#4A4A4A] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isBusy}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#D4AF37] focus:outline-none transition-colors p-1"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-red-400 text-xs text-left animate-fadeIn"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isBusy || !displayName || !email || !password}
          className="w-full flex items-center justify-center py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-lg disabled:cursor-not-allowed"
          style={{
            background:
              isBusy || !displayName || !email || !password
                ? '#1A1A1A'
                : 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
            color: isBusy || !displayName || !email || !password ? '#4A4A4A' : '#080808',
          }}
        >
          {emailLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Creating Account...</span>
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Visual Divider */}
      <div className="relative my-6">
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
        onClick={handleGoogleSignUp}
        loading={googleLoading}
        disabled={isBusy}
      />

      {/* Navigation to Sign In */}
      <div className="mt-6 text-center text-xs text-[#6B6B6B]">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onToggleMode}
          disabled={isBusy}
          className="text-[#D4AF37] hover:text-[#F0C040] font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default SignUpForm;
