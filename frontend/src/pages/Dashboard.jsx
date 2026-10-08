import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp, TrendingDown, Minus, Gamepad2, Target,
  Dna, Brain, RefreshCw, ArrowRight, Trophy, Zap,
  CheckCircle, AlertCircle, Loader2, Link2, Crown, Swords
} from 'lucide-react';
import { getChessProfile, getDNA, getModels, triggerSync } from '../api';

const StatCard = ({ label, value, sub, breakdown, icon: Icon, color }) => (
  <div
    className="p-5 rounded-2xl flex flex-col justify-between min-h-[148px] transition-all duration-200 hover:scale-[1.01] hover:border-[rgba(197,160,89,0.4)] group"
    style={{
      background: 'linear-gradient(145deg, #0F1017 0%, #08090E 100%)',
      border: '1px solid rgba(197, 160, 89, 0.15)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(197, 160, 89, 0.08)',
    }}
  >
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-widest text-[#7E8092] group-hover:text-[#D4B46A] transition-colors whitespace-nowrap">
        {label}
      </span>
      {Icon && (
        <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#141622] group-hover:bg-[#1A1D2B] border border-[#1E202E] transition-colors">
          <Icon size={14} style={{ color: color || '#C5A059' }} />
        </div>
      )}
    </div>

    <div className="my-1.5">
      <div className="text-3xl font-black font-display tracking-tight" style={{ color: color || '#F3EFE6' }}>
        {value}
      </div>
    </div>

    {breakdown ? (
      <div className="mt-1 pt-2 border-t border-[rgba(255,255,255,0.06)]">
        {breakdown}
      </div>
    ) : (
      <div className="text-xs font-medium text-[#7E8092] truncate">
        {sub || '\u00A0'}
      </div>
    )}
  </div>
);

const ResultBadge = ({ result }) => {
  const map = {
    win: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', label: 'W' },
    loss: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.25)', label: 'L' },
    draw: { bg: 'rgba(197,160,89,0.14)', color: '#D4B46A', border: 'rgba(197,160,89,0.3)', label: 'D' },
  };
  const s = map[result] || map.draw;
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shadow-sm"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
};

const SyncStatus = ({ status, onSync }) => {
  if (status === 'running') return (
    <div className="flex items-center space-x-1.5 text-xs font-medium" style={{ color: '#D4B46A' }}>
      <Loader2 size={12} className="animate-spin" />
      <span>Syncing games...</span>
    </div>
  );
  if (status === 'done') return (
    <div className="flex items-center space-x-1.5 text-xs font-medium" style={{ color: '#4ade80' }}>
      <CheckCircle size={12} />
      <span>Sync complete</span>
    </div>
  );
  return (
    <button onClick={onSync} className="flex items-center space-x-1.5 text-xs font-medium transition-all"
      style={{ color: '#7E8092' }}
      onMouseEnter={e => e.currentTarget.style.color = '#C5A059'}
      onMouseLeave={e => e.currentTarget.style.color = '#7E8092'}
    >
      <RefreshCw size={12} />
      <span>Sync games</span>
    </button>
  );
};

let clientDashboardCache = null;
export const clearClientDashboardCache = () => {
  clientDashboardCache = null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(clientDashboardCache?.profile || null);
  const [dna, setDna] = useState(clientDashboardCache?.dna || null);
  const [models, setModels] = useState(clientDashboardCache?.models || null);
  const [pageLoading, setPageLoading] = useState(!clientDashboardCache);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [timeControl, setTimeControl] = useState('all');

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!clientDashboardCache) {
        setPageLoading(true);
      }
      try {
        const [pRes, dRes, mRes] = await Promise.allSettled([
          getChessProfile(), getDNA(), getModels(),
        ]);
        if (!isMounted) return;

        const nextProfile = pRes.status === 'fulfilled' ? (pRes.value.data?.chessProfile || pRes.value.data?.data || pRes.value.data) : null;
        const nextDna = dRes.status === 'fulfilled' ? (dRes.value.data?.dna || dRes.value.data?.data || dRes.value.data) : null;
        const nextModels = mRes.status === 'fulfilled' ? (mRes.value.data?.models || mRes.value.data) : null;

        if (nextProfile) setProfile(nextProfile);
        if (nextDna) setDna(nextDna);
        if (nextModels) setModels(nextModels);

        clientDashboardCache = {
          profile: nextProfile,
          dna: nextDna,
          models: nextModels,
          timestamp: Date.now(),
        };
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        if (isMounted) setPageLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleSync = async () => {
    setSyncStatus('running');
    clientDashboardCache = null;
    try {
      await triggerSync();
      // Brief pause for backend fast sync to settle, then refresh all dashboard state
      await new Promise(r => setTimeout(r, 1200));
      const [pRes, dRes, mRes] = await Promise.allSettled([
        getChessProfile(), getDNA(), getModels(),
      ]);
      const nextProfile = pRes.status === 'fulfilled' ? (pRes.value.data?.chessProfile || pRes.value.data?.data || pRes.value.data) : null;
      const nextDna = dRes.status === 'fulfilled' ? (dRes.value.data?.dna || dRes.value.data?.data || dRes.value.data) : null;
      const nextModels = mRes.status === 'fulfilled' ? (mRes.value.data?.models || mRes.value.data) : null;

      if (nextProfile) setProfile(nextProfile);
      if (nextDna) setDna(nextDna);
      if (nextModels) setModels(nextModels);

      clientDashboardCache = {
        profile: nextProfile,
        dna: nextDna,
        models: nextModels,
        timestamp: Date.now(),
      };
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch {
      setSyncStatus('idle');
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C5A059' }} />
      </div>
    );
  }

  const hasProfile = !!profile?.chessUsername;

  const activeStats = (timeControl === 'all')
    ? (profile?.stats?.all || profile?.stats?.overall || {
        wins: 0, losses: 0, draws: 0, totalGames: 0,
        ratedGames: 0, unratedGames: 0,
        currentRating: profile?.stats?.rapid?.currentRating || profile?.stats?.blitz?.currentRating || profile?.stats?.bullet?.currentRating || '—',
        peakRating: Math.max(
          profile?.stats?.rapid?.peakRating || 0,
          profile?.stats?.blitz?.peakRating || 0,
          profile?.stats?.bullet?.peakRating || 0
        ) || '—',
      })
    : (profile?.stats?.[timeControl] || {
        wins: 0, losses: 0, draws: 0, totalGames: 0,
        ratedGames: 0, unratedGames: 0,
        currentRating: '—', peakRating: '—',
      });

  const ratedMatchesCount = activeStats.ratedGames ?? activeStats.totalGames ?? 0;
  const unratedMatchesCount = activeStats.unratedGames ?? 0;
  const totalMatchesCount = ratedMatchesCount + unratedMatchesCount;

  // Exact rated record matching Chess.com
  const ratedWins = activeStats.ratedWins ?? activeStats.wins ?? 0;
  const ratedLosses = activeStats.ratedLosses ?? activeStats.losses ?? 0;
  const ratedDraws = activeStats.ratedDraws ?? activeStats.draws ?? 0;
  const ratedWinRateVal = ratedMatchesCount > 0 ? Math.round((ratedWins / ratedMatchesCount) * 100) : 0;

  const currentRatingVal = activeStats.currentRating || '—';
  const peakRatingVal = activeStats.peakRating || '—';

  const tcDisplayName = timeControl === 'all' ? 'All' : timeControl.charAt(0).toUpperCase() + timeControl.slice(1);
  const totalMatchesSub = unratedMatchesCount > 0
    ? `${ratedMatchesCount.toLocaleString()} rated · ${unratedMatchesCount.toLocaleString()} casual`
    : timeControl === 'all'
    ? `${ratedMatchesCount.toLocaleString()} rated matches`
    : `${ratedMatchesCount.toLocaleString()} ${tcDisplayName.toLowerCase()} rated`;

  const winRateSub = `${ratedWins}W · ${ratedLosses}L · ${ratedDraws}D (Rated)`;
  const currentRatingSub = timeControl === 'all'
    ? 'Primary rating (Rapid)'
    : `Active ${tcDisplayName} rating`;
  const peakRatingSub = timeControl === 'all'
    ? 'All-time best'
    : `Peak ${tcDisplayName} rating`;

  const dnaSnippets = dna?.traits?.slice(0, 4) || [];
  const recentGames = profile?.recentGames?.slice(0, 7) || [];
  const hasModels = models && (models.currentSelf || models.peakSelf);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display" style={{ color: '#F3EFE6' }}>
            Welcome back, <span style={{
              background: 'linear-gradient(135deg, #E6C87C 0%, #C5A059 45%, #9B7830 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>{displayName}</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#7E8092' }}>
            {hasProfile ? `Connected as ${profile.chessUsername}` : 'Connect your Chess.com account to get started'}
          </p>
        </div>
        {hasProfile && <SyncStatus status={syncStatus} onSync={handleSync} />}
      </div>

      {!hasProfile && (
        <div className="p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ background: 'rgba(197,160,89,0.06)', border: '1px solid rgba(197,160,89,0.22)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(197,160,89,0.12)' }}>
              <Link2 size={16} style={{ color: '#C5A059' }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#F3EFE6' }}>Connect Chess.com</p>
              <p className="text-xs" style={{ color: '#7E8092' }}>Your dashboard is empty. Connect your account to sync your games.</p>
            </div>
          </div>
          <Link to="/connect"
            className="flex items-center justify-center space-x-1.5 text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap shadow-md"
            style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)', color: '#040406' }}>
            <span>Connect Now</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {hasProfile && (
        <>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ background: '#C5A059' }} />
                <span className="text-xs font-bold uppercase tracking-wider text-[#8A8D9F]">
                  Performance Overview
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#12141C] text-[#7E8092] border border-[#181A24]">
                  Chess.com Parity
                </span>
              </div>
              
              <div className="inline-flex items-center p-1 rounded-xl bg-[#090A0E] border border-[#181A24] shadow-inner self-start sm:self-auto">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'rapid', label: 'RAPID' },
                  { id: 'blitz', label: 'BLITZ' },
                  { id: 'bullet', label: 'BULLET' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTimeControl(tab.id)}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all duration-200 tracking-wider ${
                      timeControl === tab.id
                        ? 'bg-gradient-to-r from-[#B58D3D] via-[#D4B46A] to-[#926E28] text-[#040406] shadow-sm font-extrabold'
                        : 'text-[#7E8092] hover:text-[#F3EFE6] hover:bg-[#141622]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Matches"
                value={totalMatchesCount.toLocaleString()}
                breakdown={
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-[rgba(197,160,89,0.12)] border border-[rgba(197,160,89,0.25)]">
                      <span className="text-[10px] uppercase font-bold text-[#D4B46A]">Rated</span>
                      <span className="text-xs font-black text-[#F3EFE6]">{ratedMatchesCount.toLocaleString()}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#12141F] border border-[#1E2130]">
                      <span className="text-[10px] uppercase font-bold text-[#7E8092]">Unrated</span>
                      <span className="text-xs font-black text-[#C5C8D8]">{unratedMatchesCount.toLocaleString()}</span>
                    </div>
                  </div>
                }
                sub={`${ratedMatchesCount.toLocaleString()} rated · ${unratedMatchesCount.toLocaleString()} unrated`}
                icon={Gamepad2}
                color="#F3EFE6"
              />
              <StatCard
                label="Win Rate"
                value={`${ratedWinRateVal}%`}
                sub={winRateSub}
                icon={Trophy}
                color="#D4B46A"
              />
              <StatCard
                label="Current Rating"
                value={currentRatingVal}
                sub={currentRatingSub}
                icon={TrendingUp}
                color="#F3EFE6"
              />
              <StatCard
                label="Peak Rating"
                value={peakRatingVal}
                sub={peakRatingSub}
                icon={Crown}
                color="#D4B46A"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl overflow-hidden"
              style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#181A24' }}>
                <div className="flex items-center space-x-2">
                  <Gamepad2 size={14} style={{ color: '#C5A059' }} />
                  <span className="font-semibold text-sm" style={{ color: '#F3EFE6' }}>Recent Games</span>
                </div>
                <Link to="/games" className="text-xs flex items-center space-x-1"
                  style={{ color: '#7E8092' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#D4B46A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#7E8092'}
                >
                  <span>View all</span>
                  <ArrowRight size={10} />
                </Link>
              </div>
              <div className="divide-y divide-[#141622]">
                {recentGames.length === 0 ? (
                  <p className="text-sm p-5 text-center" style={{ color: '#7E8092' }}>No recent games found.</p>
                ) : (
                  recentGames.map((game, i) => (
                    <div key={game.id || i} className="flex items-center px-5 py-3 hover:bg-[rgba(197,160,89,0.03)] transition-colors">
                      <ResultBadge result={game.result} />
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: '#F3EFE6' }}>
                          vs {game.opponent}
                          <span className="ml-2" style={{ color: '#5A5D70' }}>({game.color})</span>
                        </p>
                        <p className="text-xs truncate" style={{ color: '#7E8092' }}>{game.opening}</p>
                      </div>
                      <div className="text-right ml-3">
                        <div className="text-xs font-bold" style={{
                          color: game.result === 'win' ? '#4ade80' : game.result === 'loss' ? '#f87171' : '#D4B46A'
                        }}>
                          {game.rating}
                        </div>
                        <div className="text-xs" style={{ color: '#5A5D70' }}>{game.date}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#181A24' }}>
                  <div className="flex items-center space-x-2">
                    <Dna size={14} style={{ color: '#C5A059' }} />
                    <span className="font-semibold text-sm" style={{ color: '#F3EFE6' }}>Chess DNA</span>
                  </div>
                  <Link to="/dna" className="text-xs" style={{ color: '#7E8092' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#D4B46A'}
                    onMouseLeave={e => e.currentTarget.style.color = '#7E8092'}>
                    Details →
                  </Link>
                </div>
                <div className="p-5 space-y-3">
                  {dnaSnippets.length === 0 ? (
                    <p className="text-sm text-center" style={{ color: '#7E8092' }}>DNA not yet generated. Train a model to view DNA.</p>
                  ) : (
                    dnaSnippets.map(({ label, value }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs" style={{ color: '#7E8092' }}>{label}</span>
                          <span className="text-xs font-bold" style={{ color: '#D4B46A' }}>{value}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#141622' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${value}%`, background: 'linear-gradient(90deg, #9B7830, #C5A059, #D4B46A)' }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                <div className="flex items-center space-x-2 px-5 py-4 border-b" style={{ borderColor: '#181A24' }}>
                  <Brain size={14} style={{ color: '#C5A059' }} />
                  <span className="font-semibold text-sm" style={{ color: '#F3EFE6' }}>AI Models</span>
                </div>
                <div className="p-5 space-y-3">
                  {['Current Self', 'Peak Self'].map((name) => {
                    const isReady = hasModels;
                    return (
                      <div key={name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {isReady
                            ? <CheckCircle size={12} style={{ color: '#4ade80' }} />
                            : <AlertCircle size={12} style={{ color: '#5A5D70' }} />}
                          <span className="text-xs font-medium" style={{ color: isReady ? '#F3EFE6' : '#5A5D70' }}>{name}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: isReady ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
                            color: isReady ? '#4ade80' : '#5A5D70',
                            border: `1px solid ${isReady ? 'rgba(34,197,94,0.25)' : '#181A24'}`,
                          }}>
                          {isReady ? 'Ready' : 'Not trained'}
                        </span>
                      </div>
                    );
                  })}
                  <Link to="/training"
                    className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                    style={{
                      background: 'rgba(197,160,89,0.1)', color: '#D4B46A',
                      border: '1px solid rgba(197,160,89,0.25)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(197,160,89,0.18)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(197,160,89,0.1)'; }}
                  >
                    <Zap size={12} />
                    <span>Train Models</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Play AI', icon: Gamepad2, to: '/play', desc: 'vs Current Self' },
          { label: 'Arena', icon: Trophy, to: '/arena', desc: 'Ranked battles' },
          { label: 'Coach', icon: Brain, to: '/coach', desc: 'Get insights' },
          { label: 'Training', icon: Target, to: '/training', desc: 'Drill patterns' },
        ].map(({ label, icon: Icon, to, desc }) => (
          <Link key={to} to={to}
            className="flex flex-col items-center p-4 rounded-2xl text-center transition-all duration-200 hover:-translate-y-0.5 group"
            style={{ background: '#0B0C12', border: '1px solid #181A24' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(197,160,89,0.35)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(197,160,89,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#181A24'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all shadow-sm"
              style={{ background: 'rgba(197,160,89,0.1)', border: '1px solid rgba(197,160,89,0.22)' }}>
              <Icon size={18} style={{ color: '#D4B46A' }} />
            </div>
            <p className="text-xs font-bold mb-0.5 tracking-wide" style={{ color: '#F3EFE6' }}>{label}</p>
            <p className="text-xs" style={{ color: '#7E8092' }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
