import React from "react";
import { Sparkles, Dna, Swords, BrainCircuit, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export const Landing = ({ onConnect }) => {
  return (
    <div className="relative overflow-hidden pt-6 pb-16">
      {/* Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-xs font-semibold text-gold-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI CHESS EVOLUTION LABORATORY</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Meet the chess player <br />
            <span className="text-gold-gradient">you're becoming.</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Connect your Chess.com profile, analyze your complete available game history, discover your individual
            Chess DNA, and play against your evolving <strong className="text-white">Peak Self AI</strong>.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onConnect}
              className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-500 to-gold-600 px-8 py-4 text-base font-bold text-dark-900 shadow-xl shadow-gold-500/25 transition-all hover:scale-105 hover:shadow-gold-500/40"
            >
              <Cpu className="h-5 w-5" />
              <span>Connect Chess.com</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Visual Journey Diagram */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-dark-800/80 p-8 backdrop-blur-xl shadow-2xl">
          <p className="text-xs font-bold tracking-widest text-gold-400 uppercase text-center mb-8">
            The Continuous AI Evolution Loop
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-dark-900/60 border border-white/5">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white">1. Chess.com Sync</h3>
              <p className="text-xs text-gray-400">Automatic PGN import from your public profile history.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-dark-900/60 border border-white/5">
              <div className="h-12 w-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
                <Dna className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white">2. Chess DNA</h3>
              <p className="text-xs text-gray-400">7-dimensional playing style & weakness extraction.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-dark-900/60 border border-white/5">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Swords className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white">3. Current & Peak Self</h3>
              <p className="text-xs text-gray-400">Play against your current style or stronger Peak Self opponent.</p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-2xl bg-dark-900/60 border border-white/5">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-white">4. Personal Training</h3>
              <p className="text-xs text-gray-400">Weakness-tailored puzzles & real-time Stockfish coaching.</p>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-gold-500/10 flex items-center justify-center text-gold-400 border border-gold-500/20">
              <Dna className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Individual Playing Model</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Unlike generic chess bots, Chess Evolve measures your exact aggression, risk tolerance, tactical preferences, and endgame conversion rates.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <Swords className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Peak Self Opponent</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Experience playing against a stronger representation of your own style that eliminates your recurring blunder patterns.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">AI Coach & Weakness Lab</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Target knight forks, king safety lapses, and endgame conversions with custom puzzles generated from your own games.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
