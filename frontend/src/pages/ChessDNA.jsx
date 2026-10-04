import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Dna, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export const ChessDNA = () => {
  const [dna, setDna] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDna() {
      try {
        const res = await apiClient.get('/dna/current');
        setDna(res.data.dna);
      } catch (err) {
        console.error('Failed to fetch DNA:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDna();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!dna) return null;

  const dimensions = [
    { name: 'Aggression', val: dna.aggression, desc: 'Tendency to launch direct pawn and piece attacks' },
    { name: 'Risk Taking', val: dna.riskTaking, desc: 'Willingness to accept unbalanced tactical complexity' },
    { name: 'Tactical Preference', val: dna.tacticalPreference, desc: 'Prioritizing sharp tactical combinations over quiet moves' },
    { name: 'Positional Preference', val: dna.positionalPreference, desc: 'Building long-term piece coordination & pawn structure' },
    { name: 'Defensive Ability', val: dna.defensiveAbility, desc: 'Resilience under opponent pressure and counterplay' },
    { name: 'Sacrifice Tendency', val: dna.sacrificeTendency, desc: 'Frequency of material sacrifices for initiative' },
    { name: 'Trading Tendency', val: dna.tradingTendency, desc: 'Propensity to simplify the board via piece trades' },
    { name: 'Opening Diversity', val: dna.openingDiversity, desc: 'Breadth of opening systems played across games' },
    { name: 'Endgame Ability', val: dna.endgameAbility, desc: 'Conversion precision in rook & pawn endgames' },
    { name: 'King Safety', val: dna.kingSafety, desc: 'Castling speed and defensive pawn shield preservation' },
    { name: 'Attack Preference', val: dna.attackPreference, desc: 'Focus on king-side pawn storms and heavy piece batteries' },
    { name: 'Simplification Preference', val: dna.simplificationPreference, desc: 'Converting winning advantages into clean endgames' },
    { name: 'Time Pressure Precision', val: dna.timePressureBehavior, desc: 'Decision accuracy in fast blitz/bullet time scenarios' },
  ];

  const radarData = dimensions.slice(0, 6).map(d => ({ subject: d.name, A: d.val }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center space-x-3">
          <Dna className="w-8 h-8 text-emerald-400" />
          <span>13-Dimension Chess DNA Profile</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Generated entirely from your real historical decisions and Stockfish evaluation metrics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Radar Summary Card */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-panel space-y-6">
          <h2 className="text-xl font-black text-white">DNA Fingerprint</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <Radar name="Chess DNA" dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Identified Strengths</h3>
              <ul className="text-xs text-slate-200 space-y-1">
                {(dna.topStrengths || []).map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Recurring Weaknesses</h3>
              <ul className="text-xs text-slate-200 space-y-1">
                {(dna.topWeaknesses || []).map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 13 Dimension Progress List */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel space-y-6">
          <h2 className="text-xl font-black text-white">Full Style Dimension Breakdown</h2>
          <div className="space-y-5">
            {dimensions.map((d, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-white">{d.name}</span>
                  <span className="text-emerald-400">{d.val} / 100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface border border-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(d.val, 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
