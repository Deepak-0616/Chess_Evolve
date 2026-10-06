import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Crown } from 'lucide-react';

const Landing = () => {
  const { signUpWithEmail, signInWithEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6 w-full max-w-sm mb-12 shadow-2xl">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                required
              />
            </div>
            {error && <div className="text-red-400 text-xs text-left">{error}</div>}
            
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center py-3 rounded-xl font-bold text-sm transition-all duration-200"
              style={{
                background: (loading || !email || !password) ? '#1A1A1A' : 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #B8960C 100%)',
                color: (loading || !email || !password) ? '#4A4A4A' : '#080808',
              }}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
          
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-xs text-[#6B6B6B] mt-4 hover:text-[#D4AF37] transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

      </main>

      <footer className="relative z-10 py-6 text-center text-xs" style={{ color: '#2A2A2A', borderTop: '1px solid #111' }}>
        © 2025 Chess Evolve · AI-Powered Chess Evolution Platform
      </footer>
    </div>
  );
};

export default Landing;
