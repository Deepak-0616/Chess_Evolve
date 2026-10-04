import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp, TrendingDown, Minus, Gamepad2, Target,
  Dna, Brain, RefreshCw, ArrowRight, Trophy, Zap,
  Clock, CheckCircle, AlertCircle, Loader2, Link2
} from 'lucide-react';
import { getChessProfile, getDNA, getModels, triggerSync } from '../api';

// ————————————— Demo Data ——————————————
const DEMO_STATS = {
  totalGames: 248,
  wins: 134,
  losses: 89,
  draws: 25,
  winRate: 54,
  currentRating: 1453,
  peakRating: 1612,
  mostPlayedOpening: 'Sicilian Defense',
};

const DEMO_DNA_SNIPPETS = [
  { label: 'Aggression', value: 72 },
  { label: 'Positional', value: 58 },
  { label: 'Endgame', value: 65 },
  { label: 'Tactical', value: 79 },
];

const DEMO_RECENT = [
  { id: 1, result: 'win', opponent: 'Player_Alpha', color: 'white', opening: 'Ruy Lopez', rating: '+8', date: '2h ago' },
  { id: 2, result: 'loss', opponent: 'Chess_Master', color: 'black', opening: 'French Defense', rating: '-12', date: '5h ago' },
  { id: 3, result: 'draw', opponent: 'NightRider88', color: 'white', opening: 'Italian Game', rating: '0', date: '1d ago' },
  { id: 4, result: 'win', opponent: 'Pawn_Storm', color: 'black', opening: 'Sicilian Defense', rating: '+10', date: '1d ago' },
  { id: 5, result: 'win', opponent: 'EndgameKing', color: 'white', opening: 'Queen\'s Gambit', rating: '+7', date: '2d ago' },
];

// ————————————— Sub-Components ——————————————
const StatCard = ({ label, value, sub, trend, color }) => (
  <div
    className="p-5 rounded-2xl transition-all duration-200 hover:scale-[1.01]"
    style={{
      background: 'linear-gradient(145deg, #141414 0%, #111111 100%)',
      border: '1px solid #1A1A1A',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4A4A4A' }}>{label}</p>
      {trend === 'up' && <TrendingUp size={14} style={{ color: '#4ade80' }} />}
      {trend === 'down' && <TrendingDown size={14} style={{ color: '#f87171' }} />}
      {trend === 'flat' && <Minus size={14} style={{ color: '#6B6B6B' }} />}
    </div>
    <div className="text-3xl font-black font-display" style={{ color: color || '#F5F0E0' }}>
      {value}
    </div>
    {sub && <div className="text-xs mt-1.5" style={{ color: '#4A4A4A' }}>{sub}</div>}
  </div>
);

const ResultBadge = ({ result }) => {
  const map = {
    win: { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', label: 'W' },
    loss: { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.25)', label: 'L' },
    draw: { bg: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: 'rgba(212,175,55,0.25)', label: 'D' },
  };
  const s = map[result] || map.draw;
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
};

const SyncStatus = ({ status, onSync }) => {
  if (status === 'running') return (
    <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#D4AF37' }}>
      <Loader2 size={12} className="animate-spin" />
      <span>Syncing games...</span>
    </div>
  );
  if (status === 'done') return (
    <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#4ade80' }}>
      <CheckCircle size={12} />
      <span>Sync complete</span>
    </div>
  );
  return (
    <button onClick={onSync} className="flex items-center space-x-1.5 text-xs transition-all"
      style={{ color: '#6B6B6B' }}
      onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
      onMouseLeave={e => e.currentTarget.style.color = '#6B6B6B'}
    >
      <RefreshCw size={12} />
      <span>Sync games</span>
    </button>
  );
};

// ————————————— Main Component ——————————————
const Dashboard = () => {
  const { user, isDevMode } = useAuth();
  const [profile, setProfile] = useState(null);
  const [dna, setDna] = useState(null);
  const [models, setModels] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('idle');

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';

  useEffect(() => {
    const load = async () => {
      setPageLoading(true);
      try {
        const [pRes, dRes, mRes] = await Promise.allSettled([
          getChessProfile(), getDNA(), getModels(),
        ]);
        if (pRes.status === 'fulfilled') setProfile(pRes.value.data?.data);
        if (dRes.status === 'fulfilled') setDna(dRes.value.data?.data);
        if (mRes.status === 'fulfilled') setModels(mRes.value.data?.data);
      } catch {}
      setPageLoading(false);
    };
    load();
  }, []);

  const handleSync = async () => {
    setSyncStatus('running');
    try {
      await triggerSync();
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch {
      setSyncStatus('idle');
    }
  };

  const stats = profile ? {
    totalGames: profile.totalGames || 0,
    wins: profile.wins || 0,
    losses: profile.losses || 0,
    draws: profile.draws || 0,
    winRate: profile.totalGames ? Math.round((profile.wins / profile.totalGames) * 100) : 0,
    currentRating: profile.currentRating || '—',
    peakRating: profile.peakRating || '—',
  } : DEMO_STATS;

  const dnaSnippets = dna?.traits?.slice(0, 4) || DEMO_DNA_SNIPPETS;
  const recentGames = profile?.recentGames || DEMO_RECENT;

  const hasProfile = !!profile?.chessUsername;
  const hasModels = models && (models.currentSelf || models.peakSelf);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: '#F5F0E0' }}>
            Welcome back, <span style={{
              background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{displayName}</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>
            {hasProfile ? `Connected as ${profile.chessUsername}` : 'Connect your Chess.com account to get started'}
          </p>
        </div>
        <SyncStatus status={syncStatus} onSync={handleSync} />
      </div>

      {/* Connect prompt */}
      {!hasProfile && !pageLoading && (
        <div className="p-5 rounded-2xl flex items-center justify-between"
          style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.1)' }}>
              <Link2 size={16} style={{ color: '#D4AF37' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#F5F0E0' }}>Connect Chess.com</p>
              <p className="text-xs" style={{ color: '#6B6B6B' }}>Showing demo data — connect your account to see real stats</p>
            </div>
          </div>
          <Link to="/connect"
            className="flex items-center space-x-1.5 text-xs font-bold px-4 py-2 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}>
            <span>Connect</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Games" value={stats.totalGames.toLocaleString()} trend="flat" />
        <StatCard label="Win Rate" value={`${stats.winRate}%`}
          sub={`${stats.wins}W · ${stats.losses}L · ${stats.draws}D`}
          trend={stats.winRate > 50 ? 'up' : 'down'}
          color="#D4AF37" />
        <StatCard label="Current Rating" value={stats.currentRating}
          trend={stats.currentRating > 1400 ? 'up' : 'flat'} />
        <StatCard label="Peak Rating" value={stats.peakRating}
          sub="All-time best"
          color="#F0C040" trend="up" />
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Games */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden"
          style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1A1A1A' }}>
            <div className="flex items-center space-x-2">
              <Gamepad2 size={14} style={{ color: '#D4AF37' }} />
              <span className="font-semibold text-sm" style={{ color: '#F5F0E0' }}>Recent Games</span>
            </div>
            <Link to="/games" className="text-xs flex items-center space-x-1"
              style={{ color: '#4A4A4A' }}
              onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
              onMouseLeave={e => e.currentTarget.style.color = '#4A4A4A'}
            >
              <span>View all</span>
              <ArrowRight size={10} />
            </Link>
          </div>
          <div className="divide-y" style={{ divideColor: '#111' }}>
            {recentGames.map((game, i) => (
              <div key={game.id || i} className="flex items-center px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <ResultBadge result={game.result} />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#F5F0E0' }}>
                    vs {game.opponent}
                    <span className="ml-2" style={{ color: '#3A3A3A' }}>({game.color})</span>
                  </p>
                  <p className="text-xs truncate" style={{ color: '#4A4A4A' }}>{game.opening}</p>
                </div>
                <div className="text-right ml-3">
                  <div className="text-xs font-bold" style={{
                    color: game.result === 'win' ? '#4ade80' : game.result === 'loss' ? '#f87171' : '#D4AF37'
                  }}>
                    {game.rating}
                  </div>
                  <div className="text-xs" style={{ color: '#3A3A3A' }}>{game.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* DNA Snapshot */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1A1A1A' }}>
              <div className="flex items-center space-x-2">
                <Dna size={14} style={{ color: '#D4AF37' }} />
                <span className="font-semibold text-sm" style={{ color: '#F5F0E0' }}>Chess DNA</span>
              </div>
              <Link to="/dna" className="text-xs" style={{ color: '#4A4A4A' }}
                onMouseEnter={e => e.currentTarget.style.color = '#D4AF37'}
                onMouseLeave={e => e.currentTarget.style.color = '#4A4A4A'}>
                Details →
              </Link>
            </div>
            <div className="p-5 space-y-3">
              {dnaSnippets.map(({ label, value }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#6B6B6B' }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color: '#D4AF37' }}>{value}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${value}%`, background: 'linear-gradient(90deg, #D4AF37, #F0C040)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Model */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            <div className="flex items-center space-x-2 px-5 py-4 border-b" style={{ borderColor: '#1A1A1A' }}>
              <Brain size={14} style={{ color: '#D4AF37' }} />
              <span className="font-semibold text-sm" style={{ color: '#F5F0E0' }}>AI Models</span>
            </div>
            <div className="p-5 space-y-3">
              {['Current Self', 'Peak Self'].map((name) => {
                const isReady = hasModels;
                return (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isReady
                        ? <CheckCircle size={12} style={{ color: '#4ade80' }} />
                        : <AlertCircle size={12} style={{ color: '#4A4A4A' }} />}
                      <span className="text-xs" style={{ color: isReady ? '#F5F0E0' : '#4A4A4A' }}>{name}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: isReady ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                        color: isReady ? '#4ade80' : '#4A4A4A',
                        border: `1px solid ${isReady ? 'rgba(34,197,94,0.2)' : '#1A1A1A'}`,
                      }}>
                      {isReady ? 'Ready' : 'Not trained'}
                    </span>
                  </div>
                );
              })}
              <Link to="/training"
                className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: 'rgba(212,175,55,0.08)', color: '#D4AF37',
                  border: '1px solid rgba(212,175,55,0.2)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; }}
              >
                <Zap size={12} />
                <span>Train Models</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Play AI', icon: Gamepad2, to: '/play', desc: 'vs Current Self' },
          { label: 'Arena', icon: Trophy, to: '/arena', desc: 'Ranked battles' },
          { label: 'Coach', icon: Brain, to: '/coach', desc: 'Get insights' },
          { label: 'Training', icon: Target, to: '/training', desc: 'Drill patterns' },
        ].map(({ label, icon: Icon, to, desc }) => (
          <Link key={to} to={to}
            className="flex flex-col items-center p-4 rounded-2xl text-center transition-all duration-200 hover:-translate-y-0.5 group"
            style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(212,175,55,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1A1A1A'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <Icon size={18} style={{ color: '#D4AF37' }} />
            </div>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#F5F0E0' }}>{label}</p>
            <p className="text-xs" style={{ color: '#4A4A4A' }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
