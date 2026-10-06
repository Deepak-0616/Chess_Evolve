import React from 'react';
import { Loader2 } from 'lucide-react';

export const GoogleIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const GoogleButton = ({
  onClick,
  loading = false,
  disabled = false,
  className = "",
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Continue with Google"
      className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 ${
        disabled || loading
          ? 'bg-[#111111] text-[#4A4A4A] border-[#1F1F1F] cursor-not-allowed opacity-75'
          : 'bg-[#121212] hover:bg-[#1A1A1A] text-[#F5F0E0] border-[#2A2A2A] hover:border-[#3D3D3D] active:scale-[0.99] cursor-pointer shadow-sm'
      } ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <GoogleIcon className="w-5 h-5 flex-shrink-0" />
          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
};

export default GoogleButton;
