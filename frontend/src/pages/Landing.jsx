import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import SignInForm from '../components/auth/SignInForm';
import SignUpForm from '../components/auth/SignUpForm';

const Landing = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#080808' }}>
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }}
      />

      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
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
            <div className="text-[10px] tracking-wider uppercase" style={{ color: '#4A4A4A' }}>AI Platform</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl text-[#F5F0E0] hover:text-[#D4AF37] transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="text-xs font-bold px-4 py-2 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
              color: '#080808',
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6 max-w-4xl">
          <span style={{ color: '#F5F0E0' }}>Master Chess</span>
          <br />
          <span style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            With Your AI Self
          </span>
        </h1>

        <p className="text-base md:text-lg max-w-2xl leading-relaxed mb-10" style={{ color: '#6B6B6B' }}>
          Chess Evolve trains a personalized AI that learns from <em>your</em> games.
          Play against your Current Self, battle your Peak Self, and evolve your game with precision insights.
        </p>

        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8 w-full max-w-sm mb-12 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 text-left">
            <h2 className="text-lg font-bold font-display" style={{ color: '#F5F0E0' }}>
              {isLogin ? 'Sign In to Your Account' : 'Create an Account'}
            </h2>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              {isLogin ? 'Welcome back! Enter your credentials' : 'Start your neural chess journey'}
            </p>
          </div>

          {isLogin ? (
            <SignInForm
              onToggleMode={() => setIsLogin(false)}
              onSuccess={() => navigate('/dashboard')}
            />
          ) : (
            <SignUpForm
              onToggleMode={() => setIsLogin(true)}
              onSuccess={() => navigate('/connect')}
            />
          )}
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs" style={{ color: '#2A2A2A', borderTop: '1px solid #111' }}>
        © 2025 Chess Evolve · AI-Powered Chess Evolution Platform
      </footer>
    </div>
  );
};

export default Landing;
