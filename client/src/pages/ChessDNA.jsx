import React, { useEffect, useState } from "react";
import { Dna, ShieldAlert, Sparkles, Zap, RotateCw, BrainCircuit } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const ChessDNA = () => {
  const [dna, setDna] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDna = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getCurrentDNA();
      setDna(res);
    } catch (err) {
      console.warn("Failed to fetch Chess DNA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDna();
  }, []);

  if (loading || !dna) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-gold-400">
          <RotateCw className="h-6 w-6 animate-spin" />
          <span className="text-sm font-semibold">Extracting Chess DNA from database games...</span>
        </div>
      </div>
    );
  }

  const { metrics, strengths, weaknesses, summaryText, version, gamesAnalyzed } = dna;

  const metricList = [
    { label: "Tactical Preference", value: metrics.tacticalPreference, color: "from-amber-400 to-amber-600" },
    { label: "Aggression Index", value: metrics.aggression, color: "from-orange-400 to-red-600" },
    { label: "Risk Tolerance", value: metrics.riskTaking, color: "from-red-400 to-pink-600" },
    { label: "Defensive Ability", value: metrics.defensiveAbility, color: "from-emerald-400 to-teal-600" },
    { label: "Positional Discipline", value: metrics.positionalPreference, color: "from-blue-400 to-indigo-600" },
    { label: "Endgame Conversion", value: metrics.endgameAbility, color: "from-violet-400 to-purple-600" },
    { label: "Sacrifice Tendency", value: metrics.sacrificeTendency, color: "from-yellow-400 to-amber-500" },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 rounded-full bg-gold-500/20 border border-gold-500/30 px-3 py-1 text-xs font-bold text-gold-400">
              <Dna className="h-3.5 w-3.5" />
              <span>Chess DNA Profile v{version}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Your Individual Playing Characteristics</h1>
            <p className="text-xs text-gray-300">
              Extracted from <strong className="text-white">{gamesAnalyzed} analyzed Chess.com PGN games</strong>.
            </p>
          </div>
        </div>

        {/* Narrative Box */}
        <div className="rounded-2xl border border-white/10 bg-dark-900/80 p-5 backdrop-blur-md">
          <div className="flex items-start space-x-3">
            <BrainCircuit className="h-5 w-5 text-gold-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-200 leading-relaxed font-medium">"{summaryText}"</p>
          </div>
        </div>
      </div>

      {/* 7 Measurable Metrics Bars */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Zap className="h-5 w-5 text-gold-400" />
            <span>Chess DNA Core Metrics</span>
          </h3>
          <span className="text-xs text-gray-400">Calculated deterministically from move vectors</span>
        </div>

        <div className="space-y-5">
          {metricList.map((m) => (
            <div key={m.label} className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-300">{m.label}</span>
                <span className="text-gold-400 font-extrabold">{m.value}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-dark-900 overflow-hidden border border-white/5 p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${m.color} transition-all duration-1000 ease-out`}
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Weaknesses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identified Strengths */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border-t-4 border-t-emerald-500">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Sparkles className="h-5 w-5" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Identified Strengths</h3>
          </div>

          <div className="space-y-4">
            {strengths.map((s) => (
              <div key={s.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{s.name}</h4>
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-extrabold text-emerald-400">
                    {s.score}% Match
                  </span>
                </div>
                <p className="text-xs text-gray-300">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recurring Weaknesses with Evidence */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border-t-4 border-t-red-500">
          <div className="flex items-center space-x-2 text-red-400">
            <ShieldAlert className="h-5 w-5" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Recurring Weakness Patterns</h3>
          </div>

          <div className="space-y-4">
            {weaknesses.map((w) => (
              <div key={w.id} className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">{w.name}</h4>
                  {w.evidenceGameCount && (
                    <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                      {w.evidenceGameCount} occurrences in recent games
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-300">{w.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
