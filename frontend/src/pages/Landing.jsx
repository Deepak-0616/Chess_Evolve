import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';
import SignInForm from '../components/auth/SignInForm';
import SignUpForm from '../components/auth/SignUpForm';

const Landing = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="h-screen max-h-screen w-full flex flex-col justify-between relative overflow-hidden" style={{ background: '#040406' }}>
      {/* Background ambient lighting */}
      <div
        className="fixed top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full opacity-[0.045] blur-[150px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #C5A059, transparent)' }}
      />
      <div
        className="fixed bottom-10 right-1/4 translate-x-1/3 w-[550px] h-[550px] rounded-full opacity-[0.035] blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #9B7830, transparent)' }}
      />

      {/* Top Navbar Header (Brand Only) */}
      <header className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5 max-w-7xl mx-auto w-full flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
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
            <div className="text-[10px] tracking-wider uppercase font-semibold" style={{ color: '#7E8092' }}>AI Platform</div>
          </div>
        </div>
      </header>

      {/* Main Hero Split View: Left Content & Right Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 lg:px-12 w-full max-w-7xl mx-auto min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full h-full">
          
          {/* Left Column: Master Chess With Your AI Self */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left space-y-5">
            <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl xl:text-7xl leading-[1.08] tracking-tight">
              <span style={{ color: '#F3EFE6' }}>Master Chess</span>
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #E6C87C 0%, #C5A059 45%, #9B7830 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                With Your AI Self
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl leading-relaxed max-w-xl" style={{ color: '#8A8D9F' }}>
              Chess Evolve trains a personalized AI that learns from <span className="text-[#F3EFE6] font-semibold italic">your</span> games.
              Play against your Current Self, battle your Peak Self, and evolve your game with precision insights.
            </p>
          </div>

          {/* Right Column: Login Box */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end items-center w-full">
            <div
              className="rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl backdrop-blur-xl"
              style={{
                background: 'linear-gradient(145deg, #0C0D13 0%, #08090E 100%)',
                border: '1px solid rgba(197, 160, 89, 0.2)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 35px rgba(197,160,89,0.06), inset 0 1px 0 rgba(197,160,89,0.12)',
              }}
            >
              <div className="mb-5 text-left">
                <h2 className="text-xl font-bold font-display" style={{ color: '#F3EFE6' }}>
                  {isLogin ? 'Sign In to Your Account' : 'Create an Account'}
                </h2>
                <p className="text-xs mt-1" style={{ color: '#7E8092' }}>
                  {isLogin ? 'Welcome back! Enter your credentials' : 'Start your personalized chess journey'}
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
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-xs flex-shrink-0" style={{ color: '#525464', borderTop: '1px solid #14151E' }}>
        © 2025 Chess Evolve · AI-Powered Chess Evolution Platform
      </footer>
    </div>
  );
};

export default Landing;

