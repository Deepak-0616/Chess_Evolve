import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, ShieldCheck, Dna, Brain, Swords, ArrowRight, Play } from 'lucide-react';

export const Landing = () => {
  const { user, signInWithGoogle, signInAsGuestDev } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-glow">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-emerald-400">
            CHESS EVOLVE
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={signInWithGoogle}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-glow transition-all hover:scale-105"
          >
            <span>Sign In with Google</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-6xl mx-auto px-6 py-16 text-center z-10 my-auto">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>Real Multi-User AI Decision Intelligence</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-8">
          Synchronize Your Games.{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
            Train Your AI Self.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Connect your Chess.com account to import your full game history. Our engine runs Stockfish evaluations to analyze your real decisions, construct your 13-dimension Chess DNA, and train your personalized <span className="text-emerald-400 font-semibold">Current Self</span> & <span className="text-indigo-400 font-semibold">Peak Self</span> PyTorch AI models.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={signInWithGoogle}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-base shadow-glow transition-all hover:scale-105 flex items-center justify-center space-x-3"
          >
            <span>Connect & Import Games</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={signInAsGuestDev}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-surface border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-base transition-colors flex items-center justify-center space-x-2"
          >
            <Play className="w-4 h-4 text-emerald-400" />
            <span>Explore Demo Environment</span>
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-2xl glass-card hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Dna className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">13-Dimension Chess DNA</h3>
            <p className="text-sm text-slate-400">
              Calculated dynamically from your actual analyzed positions: Aggression, King Safety, Tactical Preference, Endgame Skill, and recurring weakness identification.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card hover:border-indigo-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Current & Peak AI Models</h3>
            <p className="text-sm text-slate-400">
              Train PyTorch Candidate Move Rankers on your real decision patterns. Play interactive games against your Current Self and your optimized Peak Self!
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card hover:border-teal-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
              <Swords className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Community AI Arena</h3>
            <p className="text-sm text-slate-400">
              Challenge public AI models of other players in the community while your private games, data, and model binaries remain 100% protected.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 z-10">
        <p>© 2026 Chess Evolve — Real Multi-User AI Chess Intelligence Platform</p>
      </footer>
    </div>
  );
};
