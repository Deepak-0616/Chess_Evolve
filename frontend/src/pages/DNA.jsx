import React, { useEffect, useState } from 'react';
import { getDNA } from '../api';
import { Dna, TrendingUp, Zap, Shield, Target, Brain, RefreshCw } from 'lucide-react';

const DEMO_DNA = {
  overall: 74,
  lastUpdated: '2 hours ago',
  traits: [
    { key: 'aggression', label: 'Aggression Index', value: 72, description: 'How aggressively you attack and create threats', icon: Zap },
    { key: 'positional', label: 'Positional Play', value: 58, description: 'Understanding of long-term positional concepts', icon: Shield },
    { key: 'tactical', label: 'Tactical Sharpness', value: 79, description: 'Ability to spot and execute tactical combinations', icon: Target },
    { key: 'endgame', label: 'Endgame Mastery', value: 65, description: 'Precision in converting advantages in the endgame', icon: Brain },
    { key: 'opening', label: 'Opening Preparation', value: 61, description: 'Depth and variety of opening knowledge', icon: Brain },
    { key: 'time', label: 'Time Management', value: 70, description: 'Efficient use of the clock under pressure', icon: RefreshCw },
  ],
  openings: [
    { name: 'Sicilian Defense', games: 84, winRate: 61 },
    { name: 'Ruy Lopez', games: 52, winRate: 54 },
    { name: 'French Defense', games: 38, winRate: 47 },
    { name: "Queen's Gambit", games: 31, winRate: 58 },
    { name: 'Italian Game', games: 28, winRate: 57 },
  ],
  insights: [
    { type: 'strength', text: 'Exceptional tactical vision — you find combinations 85% of the time when they are available' },
    { type: 'strength', text: 'Strong in sharp, imbalanced positions — Sicilian structures play to your style' },
    { type: 'weakness', text: 'Endgame technique needs work — you lose 34% of technically won rook endings' },
    { type: 'weakness', text: 'Time pressure causes blunders in the final 5 moves — your accuracy drops 18%' },
    { type: 'tip', text: 'Study Capablanca\'s endgame technique to improve your conversion rate significantly' },
  ],
};

const TraitBar = ({ trait }) => {
  const Icon = trait.icon;
  const getColor = (v) => v >= 75 ? '#4ade80' : v >= 55 ? '#D4AF37' : '#f87171';

  return (
    <div className="p-4 rounded-xl transition-all duration-200 hover:scale-[1.01]"
      style={{ background: '#0A0A0A', border: '1px solid #1A1A1A' }}>
      <div className="flex items-center space-x-2 mb-3">
        <Icon size={14} style={{ color: '#D4AF37' }} />
        <span className="text-xs font-semibold" style={{ color: '#F5F0E0' }}>{trait.label}</span>
        <span className="ml-auto text-sm font-black" style={{ color: getColor(trait.value) }}>
          {trait.value}
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${trait.value}%`, background: `linear-gradient(90deg, ${getColor(trait.value)}99, ${getColor(trait.value)})` }} />
      </div>
      <p className="text-xs mt-2" style={{ color: '#4A4A4A' }}>{trait.description}</p>
    </div>
  );
};

const DNA = () => {
  const [dna, setDna] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getDNA();
        setDna(res.data?.data || DEMO_DNA);
      } catch {
        setDna(DEMO_DNA);
      }
      setLoading(false);
    };
    load();
  }, []);

  const data = dna || DEMO_DNA;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>Chess DNA</h2>
          <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>Your unique playing style fingerprint</p>
        </div>
        {data.lastUpdated && (
          <span className="text-xs" style={{ color: '#3A3A3A' }}>Updated {data.lastUpdated}</span>
        )}
      </div>

      {/* Overall score */}
      <div className="p-6 rounded-2xl flex items-center space-x-6"
        style={{ background: 'linear-gradient(135deg, #141414, #0F0F0F)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 0 40px rgba(212,175,55,0.06)' }}>
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#1A1A1A" strokeWidth="8" />
            <circle cx="50" cy="50" r="40" fill="none"
              stroke="url(#goldGrad)" strokeWidth="8"
              strokeDasharray={`${(data.overall / 100) * 251.2} 251.2`}
              strokeLinecap="round" />
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#F0C040" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black font-display" style={{
              background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {data.overall}
            </span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-1" style={{ color: '#F5F0E0' }}>Overall DNA Score</h3>
          <p className="text-sm" style={{ color: '#6B6B6B' }}>
            Based on {data.traits?.length || 6} key dimensions of your playing style
          </p>
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}>
              Above Average
            </span>
            <span className="text-xs" style={{ color: '#4A4A4A' }}>Top 32% of analyzed players</span>
          </div>
        </div>
      </div>

      {/* Trait grid */}
      <div>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Playing Traits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data.traits || DEMO_DNA.traits).map(trait => (
            <TraitBar key={trait.key} trait={trait} />
          ))}
        </div>
      </div>

      {/* Opening repertoire */}
      <div>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Opening Repertoire</h3>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
          <div className="grid grid-cols-12 gap-4 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider"
            style={{ borderBottom: '1px solid #1A1A1A', color: '#3A3A3A' }}>
            <div className="col-span-5">Opening</div>
            <div className="col-span-2 text-center">Games</div>
            <div className="col-span-3">Win Rate</div>
            <div className="col-span-2 text-right">Score</div>
          </div>
          {(data.openings || DEMO_DNA.openings).map((op, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-5 py-3 items-center"
              style={{ borderBottom: i < data.openings?.length - 1 ? '1px solid #0F0F0F' : 'none' }}>
              <div className="col-span-5 text-sm" style={{ color: '#F5F0E0' }}>{op.name}</div>
              <div className="col-span-2 text-center text-xs" style={{ color: '#6B6B6B' }}>{op.games}</div>
              <div className="col-span-3">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
                    <div className="h-full rounded-full" style={{
                      width: `${op.winRate}%`,
                      background: op.winRate >= 55 ? '#4ade80' : op.winRate >= 45 ? '#D4AF37' : '#f87171',
                    }} />
                  </div>
                  <span className="text-xs font-bold w-8 text-right" style={{ color: '#6B6B6B' }}>{op.winRate}%</span>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-xs font-bold"
                  style={{ color: op.winRate >= 55 ? '#4ade80' : op.winRate >= 45 ? '#D4AF37' : '#f87171' }}>
                  {op.winRate >= 55 ? 'Strong' : op.winRate >= 45 ? 'Average' : 'Weak'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div>
        <h3 className="text-sm font-bold mb-3 uppercase tracking-wider" style={{ color: '#4A4A4A' }}>AI Insights</h3>
        <div className="space-y-2">
          {(data.insights || DEMO_DNA.insights).map((ins, i) => {
            const styles = {
              strength: { bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)', dot: '#4ade80', label: '✓' },
              weakness: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', dot: '#f87171', label: '!' },
              tip: { bg: 'rgba(212,175,55,0.06)', border: 'rgba(212,175,55,0.2)', dot: '#D4AF37', label: '→' },
            };
            const s = styles[ins.type] || styles.tip;
            return (
              <div key={i} className="flex items-start space-x-3 p-4 rounded-xl"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <span className="text-sm font-bold mt-0.5 flex-shrink-0" style={{ color: s.dot }}>{s.label}</span>
                <p className="text-sm leading-relaxed" style={{ color: '#C0A060' }}>{ins.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DNA;
