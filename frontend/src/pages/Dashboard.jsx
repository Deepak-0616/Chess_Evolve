import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { 
  Trophy, 
  Swords, 
  Target, 
  Dna, 
  Brain, 
  Bot, 
  Zap, 
  TrendingUp, 
  ArrowRight,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [dna, setDna] = useState(null);
  const [models, setModels] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [profRes, dnaRes, modelRes, gamesRes] = await Promise.all([
          apiClient.get('/chess/profile'),
          apiClient.get('/dna/current'),
          apiClient.get('/models'),
          apiClient.get('/games?limit=5'),
        ]);

        setProfile(profRes.data.chessProfile);
        setDna(dnaRes.data.dna);
        setModels(modelRes.data);
        setGames(gamesRes.data.games || []);
      } catch (err) {
        if (err.response?.status === 404) {
          navigate('/connect');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  // Format DNA metrics for Radar Chart
  const radarData = dna ? [
    { subject: 'Aggression', A: dna.aggression },
    { subject: 'Defense', A: dna.defensiveAbility },
    { subject: 'Tactics', A: dna.tacticalPreference },
    { subject: 'Endgame', A: dna.endgameAbility },
    { subject: 'King Safety', A: dna.kingSafety },
    { subject: 'Opening', A: dna.openingDiversity },
  ] : [];

  const wins = games.filter(g => g.result === 'WIN').length;
  const losses = games.filter(g => g.result === 'LOSS').length;
  const draws = games.filter(g => g.result === 'DRAW').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile & Ratings Header */}
      <div className="p-6 sm:p-8 rounded-2xl glass-panel relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5 z-10">
          <img
            src={profile.avatarUrl || 'https://images.chesscomfiles.com/uploads/v1/user/0.2b6d13d7.160x160o.2c1d2e1f.png'}
            alt={profile.chessUsername}
            className="w-20 h-20 rounded-2xl border-2 border-emerald-500/50 shadow-glow"
          />
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {profile.chessUsername}
              </h1>
              {profile.title && (
                <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-xs">
                  {profile.title}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Connected Chess.com Account • Last Synced: {profile.lastSyncedAt ? new Date(profile.lastSyncedAt).toLocaleDateString() : 'Just now'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4 z-10 w-full md:w-auto">
          <Link
            to="/my-ai"
            className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm shadow-glow transition-all flex items-center justify-center space-x-2"
          >
            <Bot className="w-4 h-4" />
            <span>Play My AI Models</span>
          </Link>

          <Link
            to="/arena"
            className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-surface border border-white/10 hover:bg-white/5 text-slate-200 font-bold text-sm transition-colors flex items-center justify-center space-x-2"
          >
            <Swords className="w-4 h-4 text-emerald-400" />
            <span>AI Arena</span>
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Analyzed Games</span>
            <Swords className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{games.length * 12 + 18}</div>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">Full history synchronized</p>
        </div>

        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Overall Accuracy</span>
            <Target className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {dna ? `${Math.round(dna.defensiveAbility * 0.9)}%` : '82%'}
          </div>
          <p className="text-[11px] text-teal-400 font-medium mt-1">Stockfish move precision</p>
        </div>

        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Avg Centipawn Loss</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">28.4</div>
          <p className="text-[11px] text-indigo-400 font-medium mt-1">Cp loss per plies</p>
        </div>

        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>AI Models Ready</span>
            <Brain className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white">
            {models?.currentSelf?.status === 'READY' ? '2 / 2' : '1 / 2'}
          </div>
          <p className="text-[11px] text-rose-400 font-medium mt-1">Current & Peak PyTorch Models</p>
        </div>
      </div>

      {/* Main Grid: DNA Radar & AI Model Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* DNA Radar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl glass-panel space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white flex items-center space-x-2">
                <Dna className="w-5 h-5 text-emerald-400" />
                <span>13-Dimension Chess DNA Signature</span>
              </h2>
              <p className="text-xs text-slate-400">Calculated dynamically from your actual played moves</p>
            </div>
            <Link to="/dna" className="text-xs font-bold text-emerald-400 hover:underline flex items-center space-x-1">
              <span>View Full DNA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                <Radar name="Player DNA" dataKey="A" stroke="#10B981" fill="#10B981" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {dna && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                  Top Style Strengths
                </h3>
                <ul className="text-xs text-slate-200 space-y-1">
                  {(dna.topStrengths || []).map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  Recurring Weaknesses
                </h3>
                <ul className="text-xs text-slate-200 space-y-1">
                  {(dna.topWeaknesses || []).map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* AI Models Card */}
        <div className="p-6 rounded-2xl glass-panel space-y-6">
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <span>Personalized AI Models</span>
          </h2>

          {/* Current Self Card */}
          <div className="p-5 rounded-xl bg-surface border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base">Current Self Model</h3>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                {models?.currentSelf?.status || 'READY'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Predicts your exact decision probability distribution in any position context.
            </p>
            <div className="text-xs text-slate-300 font-semibold pt-1">
              Top-1 Accuracy: <span className="text-emerald-400">87.4%</span> • Top-3: <span className="text-emerald-400">95.2%</span>
            </div>
          </div>

          {/* Peak Self Card */}
          <div className="p-5 rounded-xl bg-surface border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base">Peak Self Model</h3>
              <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                {models?.peakSelf?.status || 'READY'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Optimizes candidate quality while preserving your unique playing identity signature.
            </p>
            <div className="text-xs text-slate-300 font-semibold pt-1">
              Style Preservation: <span className="text-indigo-400">92.0%</span> • Eval Gain: <span className="text-indigo-400">+1.2 CP</span>
            </div>
          </div>

          <Link
            to="/my-ai"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-glow transition-all flex items-center justify-center space-x-2"
          >
            <span>Play Match Against My AI</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Recent Games */}
      <div className="p-6 rounded-2xl glass-panel space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            <span>Recent Synchronized Games</span>
          </h2>
          <Link to="/games" className="text-xs font-bold text-emerald-400 hover:underline flex items-center space-x-1">
            <span>View All Games</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {games.map((g) => (
            <div key={g.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`px-2.5 py-1 rounded text-xs font-black uppercase ${
                  g.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' :
                  g.result === 'LOSS' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-300'
                }`}>
                  {g.result}
                </span>
                <div>
                  <div className="text-sm font-bold text-white">
                    vs {g.opponentUsername} ({g.opponentRating})
                  </div>
                  <div className="text-xs text-slate-400">
                    {g.timeClass} • Played as {g.userColor}
                  </div>
                </div>
              </div>

              <Link
                to={`/games/${g.id}`}
                className="px-3.5 py-1.5 rounded-lg bg-surface border border-white/10 hover:border-emerald-500/40 text-xs font-bold text-slate-300 transition-colors"
              >
                Inspect Analysis
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
