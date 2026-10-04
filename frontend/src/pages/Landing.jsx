import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Crown, Zap, Brain, Trophy, Dna, Swords, ChevronRight, Shield, Star } from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, desc }) => (
  <div
    className="p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-default"
    style={{
      background: 'linear-gradient(145deg, #141414 0%, #0F0F0F 100%)',
      border: '1px solid #2A2A2A',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)';
      e.currentTarget.style.boxShadow = '0 0 25px rgba(212,175,55,0.08)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#2A2A2A';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
      style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}
    >
      <Icon size={18} style={{ color: '#D4AF37' }} />
    </div>
    <h3 className="font-semibold text-sm mb-1.5" style={{ color: '#F5F0E0' }}>{title}</h3>
    <p className="text-xs leading-relaxed" style={{ color: '#6B6B6B' }}>{desc}</p>
  </div>
);

const StatBubble = ({ value, label }) => (
  <div className="text-center">
    <div
      className="text-3xl font-black font-display"
      style={{
        background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      {value}
    </div>
    <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>{label}</div>
  </div>
);

const Landing = () => {
  const { signInWithGoogle, continueAsDemo } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try { await signInWithGoogle(); }
    finally { setLoading(false); }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await continueAsDemo();
      navigate('/connect');
    } finally { setDemoLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#080808' }}>
      {/* Background decorations */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }}
      />

      {/* Header */}
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
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
            ♟ AI-Powered Chess
          </span>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full mb-8 text-xs font-medium"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
          <Zap size={12} />
          <span>Powered by Neural Evolution Technology</span>
        </div>

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

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="flex items-center space-x-3 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
              color: '#080808',
              boxShadow: loading ? 'none' : '0 0 30px rgba(212,175,55,0.35)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#080808" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#333" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#555" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#222" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>
          <button
            onClick={handleDemo}
            disabled={demoLoading}
            className="flex items-center space-x-2 px-8 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'rgba(212,175,55,0.06)',
              color: '#D4AF37',
              border: '1px solid rgba(212,175,55,0.25)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.06)'; }}
          >
            <Shield size={16} />
            <span>{demoLoading ? 'Loading...' : 'Explore Demo'}</span>
          </button>
        </div>

        {/* Stats */}
        <div
          className="flex items-center divide-x rounded-2xl px-8 py-5 mb-16"
          style={{ background: '#0F0F0F', border: '1px solid #1A1A1A', divideColor: '#1A1A1A' }}
        >
          <div className="px-6">
            <StatBubble value="2M+" label="Games Analyzed" />
          </div>
          <div className="px-6">
            <StatBubble value="98%" label="Model Accuracy" />
          </div>
          <div className="px-6">
            <StatBubble value="< 200ms" label="Inference Speed" />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
          <FeatureCard
            icon={Brain}
            title="Neural Self-Model"
            desc="Trains a unique neural network on your games, capturing your exact playing style and tendencies."
          />
          <FeatureCard
            icon={Dna}
            title="Chess DNA Analysis"
            desc="Deep positional analysis reveals your tactical patterns, opening preferences, and endgame traits."
          />
          <FeatureCard
            icon={Swords}
            title="Play Your AI Self"
            desc="Battle your Current or Peak Self to understand your strengths and expose hidden weaknesses."
          />
          <FeatureCard
            icon={Trophy}
            title="Arena Rankings"
            desc="Compete with other users' AI models in the global arena to climb the leaderboard."
          />
          <FeatureCard
            icon={Star}
            title="Peak Self Discovery"
            desc="Find and recreate the best version of you — your highest-rated games distilled into an AI."
          />
          <FeatureCard
            icon={Zap}
            title="Real-time Insights"
            desc="Stockfish-powered evaluation gives you accurate, move-by-move understanding of your games."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs" style={{ color: '#2A2A2A', borderTop: '1px solid #111' }}>
        © 2025 Chess Evolve · AI-Powered Chess Evolution Platform
      </footer>
    </div>
  );
};

export default Landing;
