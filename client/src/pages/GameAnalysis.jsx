import React, { useEffect, useState } from "react";
import { Activity, RotateCw, Sparkles, ArrowLeft } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const GameAnalysis = ({ gameId, onBack }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    ApiClient.getGameAnalysis(gameId)
      .then((res) => setAnalysis(res))
      .catch((err) => console.warn("Failed to load analysis:", err))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading || !analysis) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-gold-400">
          <RotateCw className="h-6 w-6 animate-spin" />
          <span className="text-sm font-semibold">Running Stockfish Game Analysis...</span>
        </div>
      </div>
    );
  }

  const { accuracy, summary, criticalMoments } = analysis;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 rounded-xl border border-white/10 bg-dark-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="inline-flex items-center space-x-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3.5 py-1 text-xs font-bold text-gold-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Stockfish Depth 16 Evaluated</span>
        </div>
      </div>

      {/* Accuracy Comparison */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-white">Stockfish Game Performance Breakdown</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-dark-900/80 p-5 space-y-2 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Your Accuracy</span>
            <p className="text-4xl font-extrabold text-white">{accuracy.player}%</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-dark-900/80 p-5 space-y-2 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Opponent Accuracy</span>
            <p className="text-4xl font-extrabold text-gold-400">{accuracy.opponent}%</p>
          </div>
        </div>

        {/* Move Quality Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase">Excellent Moves</span>
            <p className="text-xl font-bold text-white mt-1">{summary.excellentMoves}</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-center">
            <span className="text-[11px] font-semibold text-blue-400 uppercase">Inaccuracies</span>
            <p className="text-xl font-bold text-white mt-1">{summary.inaccuracies}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <span className="text-[11px] font-semibold text-amber-400 uppercase">Mistakes</span>
            <p className="text-xl font-bold text-white mt-1">{summary.mistakes}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
            <span className="text-[11px] font-semibold text-red-400 uppercase">Blunders</span>
            <p className="text-xl font-bold text-white mt-1">{summary.blunders}</p>
          </div>
        </div>
      </div>

      {/* Critical Moments List */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gold-400" />
          <span>Critical Game Moments</span>
        </h3>

        <div className="space-y-4">
          {criticalMoments.map((moment, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-5 space-y-3 ${
                moment.severity === "BLUNDER"
                  ? "border-red-500/30 bg-red-500/5"
                  : moment.severity === "MISTAKE"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-white/10 bg-dark-900/60"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className="rounded-lg bg-dark-900 border border-white/10 px-2.5 py-1 text-xs font-bold text-white">
                    Move {moment.moveNumber}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      moment.severity === "BLUNDER"
                        ? "bg-red-500/20 text-red-400"
                        : moment.severity === "MISTAKE"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {moment.severity}
                  </span>
                </div>

                <div className="text-xs font-mono text-gray-400">
                  Eval change: <span className="text-white font-bold">{moment.evaluationBefore}</span> →{" "}
                  <span className="text-gold-400 font-bold">{moment.evaluationAfter}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-dark-900/80 p-3 border border-white/5 space-y-1">
                  <span className="text-gray-400 font-semibold">Played Move</span>
                  <p className="text-base font-bold text-red-400 font-mono">{moment.playedMove}</p>
                </div>
                <div className="rounded-xl bg-dark-900/80 p-3 border border-white/5 space-y-1">
                  <span className="text-gray-400 font-semibold">Best Stockfish Move</span>
                  <p className="text-base font-bold text-emerald-400 font-mono">{moment.bestMove}</p>
                </div>
              </div>

              {moment.comment && <p className="text-xs text-gray-300 font-medium italic">"{moment.comment}"</p>}
            </div>
          ))}

          {criticalMoments.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-6">Clean game execution! No major blunders detected.</p>
          )}
        </div>
      </div>
    </div>
  );
};
