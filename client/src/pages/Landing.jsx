import React from "react";

export const Landing = ({ onConnect }) => {
  return (
    <div className="relative overflow-hidden pt-12 pb-24">
      {/* Glow Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Meet the chess player <br />
            <span className="text-gold-gradient">you're becoming.</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Connect your Chess.com profile, analyze your complete available game history, discover your individual
            Chess DNA, and play against your evolving <strong className="text-white">Peak Self AI</strong>.
          </p>

          <div className="pt-6 flex justify-center">
            <button
              onClick={onConnect}
              className="rounded-2xl bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 px-10 py-4.5 text-lg font-extrabold text-dark-900 shadow-2xl shadow-gold-500/30 transition-all duration-300 hover:scale-105 hover:shadow-gold-500/50 cursor-pointer active:scale-95"
            >
              Connect Chess.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



