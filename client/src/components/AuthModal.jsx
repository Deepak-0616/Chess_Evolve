import React, { useState } from "react";
import { X, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, displayName || "Chess Player");
      } else {
        await login(email, password);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-dark-800 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            {isRegister ? "Create Chess Evolve Account" : "Welcome Back"}
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            {isRegister
              ? "Start building your Chess DNA & Peak Self AI"
              : "Sign in to access your AI performance dashboard"}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center space-x-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-gray-300">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex"
                className="mt-1 w-full rounded-xl border border-white/10 bg-dark-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-white/10 bg-dark-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 py-3 text-sm font-bold text-dark-900 transition-all hover:shadow-lg hover:shadow-gold-500/25 disabled:opacity-50"
          >
            {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            <span>{loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="font-semibold text-gold-400 hover:underline"
          >
            {isRegister ? "Sign In" : "Register Now"}
          </button>
        </div>
      </div>
    </div>
  );
};
