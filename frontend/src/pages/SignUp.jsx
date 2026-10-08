import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import SignUpForm from '../components/auth/SignUpForm';

export const SignUp = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#040406' }}>
      {/* Subtle background ambient glow */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C5A059, transparent)' }}
      />

      {/* Top Navbar Header */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <Link to="/" className="flex items-center space-x-3 group">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)' }}
          >
            <Crown size={20} className="text-[#040406]" />
          </div>
          <div>
            <span
              className="text-lg font-bold font-display"
              style={{
                background: 'linear-gradient(135deg, #E6C87C 0%, #C5A059 45%, #9B7830 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Chess Evolve
            </span>
            <div className="text-[10px] tracking-wider uppercase font-semibold" style={{ color: '#7E8092' }}>
              AI Platform
            </div>
          </div>
        </Link>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold font-display tracking-tight" style={{ color: '#F3EFE6' }}>
              Create an Account
            </h1>
            <p className="text-xs mt-1.5" style={{ color: '#7E8092' }}>
              Start your personalized chess neural evolution journey
            </p>
          </div>

          <div
            className="rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl"
            style={{
              background: 'linear-gradient(145deg, #0C0D13 0%, #08090E 100%)',
              border: '1px solid rgba(197, 160, 89, 0.2)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(197,160,89,0.06), inset 0 1px 0 rgba(197,160,89,0.12)',
            }}
          >
            <SignUpForm
              onToggleMode={() => navigate('/login')}
              onSuccess={() => navigate('/connect')}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs" style={{ color: '#525464', borderTop: '1px solid #14151E' }}>
        © 2025 Chess Evolve · AI-Powered Chess Evolution Platform
      </footer>
    </div>
  );
};

export default SignUp;
