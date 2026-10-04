import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Dna, Target, Brain, Shield, Swords, Zap, Crosshair } from 'lucide-react';
import { getDNA } from '../api';

const TraitBar = ({ label, value, desc }) => (
  <div className="mb-4">
    <div className="flex justify-between items-end mb-1">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#F5F0E0' }}>{label}</span>
        {desc && <p className="text-[10px] mt-0.5" style={{ color: '#6B6B6B' }}>{desc}</p>}
      </div>
      <span className="text-xs font-bold" style={{ color: '#D4AF37' }}>{value}%</span>
    </div>
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
      <div className="h-full rounded-full transition-all duration-1000"
        style={{ width: `${value}%`, background: 'linear-gradient(90deg, #D4AF37, #F0C040)' }} />
    </div>
  </div>
);

const DNA = () => {
  const [dnaData, setDnaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getDNA();
        setDnaData(res.data?.data || null);
      } catch (err) {
        console.error('Failed to load DNA', err);
        setDnaData(null);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: '#1A1A1A', borderTopColor: '#D4AF37' }} />
      </div>
    );
  }

  if (!dnaData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Dna size={48} style={{ color: '#2A2A2A', marginBottom: '16px' }} />
        <h2 className="text-lg font-bold" style={{ color: '#F5F0E0' }}>No DNA Found</h2>
        <p className="text-sm mt-2 max-w-md" style={{ color: '#6B6B6B' }}>
          Connect your Chess.com account and train your AI model to generate your unique Chess DNA profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold font-display" style={{ color: '#F5F0E0' }}>Your Chess DNA</h2>
        <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>
          Neural analysis of your positional and tactical tendencies across all synced games.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center"
          style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6 w-full text-center" style={{ color: '#4A4A4A' }}>
            Playstyle Signature
          </h3>
          <div className="w-full aspect-square max-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dnaData.radar || []}>
                <PolarGrid stroke="#2A2A2A" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B6B6B', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#080808', borderColor: '#D4AF37', borderRadius: '8px' }}
                  itemStyle={{ color: '#F5F0E0' }}
                />
                <Radar name="You" dataKey="A" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl p-6" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
          <div className="flex items-center space-x-2 mb-6 pb-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <Brain size={18} style={{ color: '#D4AF37' }} />
            <h3 className="font-semibold" style={{ color: '#F5F0E0' }}>Core Tendencies</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {(dnaData.traits || []).map((t, i) => (
              <TraitBar key={i} label={t.label} value={t.value} desc={t.desc} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
          <div className="flex items-center space-x-2 mb-6 pb-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <Swords size={18} style={{ color: '#D4AF37' }} />
            <h3 className="font-semibold" style={{ color: '#F5F0E0' }}>Opening Arsenal</h3>
          </div>
          <div className="space-y-4">
            {(dnaData.openings || []).map((op, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#F5F0E0' }}>{op.name}</div>
                  <div className="text-xs mt-1" style={{ color: '#6B6B6B' }}>
                    {op.games} games • {op.winRate}% win rate
                  </div>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-lg"
                  style={{
                    background: op.winRate > 50 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: op.winRate > 50 ? '#4ade80' : '#f87171',
                  }}>
                  {op.winRate > 50 ? 'Strong' : 'Weak'}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
          <div className="flex items-center space-x-2 mb-6 pb-4" style={{ borderBottom: '1px solid #1A1A1A' }}>
            <Crosshair size={18} style={{ color: '#D4AF37' }} />
            <h3 className="font-semibold" style={{ color: '#F5F0E0' }}>Key Insights</h3>
          </div>
          <ul className="space-y-4">
            {(dnaData.insights || []).map((ins, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed p-3 rounded-xl"
                style={{ background: 'rgba(212,175,55,0.05)', color: '#D4AF37' }}>
                <Zap size={16} className="shrink-0 mt-0.5" />
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DNA;
