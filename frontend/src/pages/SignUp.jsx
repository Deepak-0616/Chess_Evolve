import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import SignUpForm from '../components/auth/SignUpForm';

export const SignUp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#080808' }}>
      {/* Subtle background ambient glow */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }}
      />

      {/* Top Navbar Header */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <Link to="/" className="flex items-center space-x-3 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)' }}
          >
            <Crown size={20} className="text-black" />
          </div>
          <div>
            <span
              className="text-lg font-bold font-display"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Chess Evolve
            </span>
            <div className="text-[10px] tracking-wider uppercase" style={{ color: '#4A4A4A' }}>
              AI Platform
            </div>
          </div>
        </Link>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display tracking-tight" style={{ color: '#F5F0E0' }}>
              Create an Account
            </h1>
            <p className="text-xs mt-1.5" style={{ color: '#6B6B6B' }}>
              Start your personalized chess neural evolution journey
            </p>
          </div>

          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <SignUpForm
              onToggleMode={() => navigate('/login')}
              onSuccess={() => navigate('/connect')}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs" style={{ color: '#2A2A2A', borderTop: '1px solid #111' }}>
        © 2025 Chess Evolve · AI-Powered Chess Evolution Platform
      </footer>
    </div>
  );
};

export default SignUp;
