import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2,
  Target,
  Shield,
  Brain,
  Award,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Sparkles,
  Flame,
  Info
} from 'lucide-react';
import { getTrainingProgress, getTrainingWeaknesses } from '../api';

const CATEGORY_META = {
  TACTICAL: { label: 'Tactical Calculation', icon: Target, color: '#C5A059' },
  DEFENSIVE: { label: 'Defensive King Safety', icon: Shield, color: '#4ADE80' },
  POSITIONAL: { label: 'Positional Mastery', icon: Brain, color: '#60A5FA' },
  ENDGAME: { label: 'Endgame Technique', icon: Award, color: '#F472B6' },
  OPENING: { label: 'Opening Precision', icon: Zap, color: '#FBBF24' },
};

export default function TrainingProgressView() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [weaknessData, setWeaknessData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pRes, wRes] = await Promise.all([
        getTrainingProgress(),
        getTrainingWeaknesses().catch(() => ({ data: { topWeaknesses: [] } }))
      ]);

      setProgressData(pRes.data);
      setWeaknessData(wRes.data);
    } catch (err) {
      console.error('Failed to load training progress:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div
            className="w-12 h-12 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: '#181A24', borderTopColor: '#C5A059' }}
          />
          <p className="text-sm font-medium" style={{ color: '#7E8092' }}>
            Aggregating training metrics & session history...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div
          className="p-8 rounded-2xl border text-center space-y-4"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-[#F3EFE6]">Unable to Load Progress</h2>
          <p className="text-sm text-neutral-400">{error}</p>
          <button
            onClick={loadProgress}
            className="px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: '#141622', border: '1px solid #181A24', color: '#C5A059' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { progress, sessionHistory } = progressData || {};
  const categoryStats = progress?.categoryPerformance || {};
  const weaknessStats = progress?.weaknessProgression || {};

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/training')}
            className="inline-flex items-center space-x-2 text-xs font-medium mb-3 hover:text-[#F3EFE6] transition-colors"
            style={{ color: '#7E8092' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Training Dashboard</span>
          </button>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#C5A059' }}>
            <BarChart2 size={14} />
            <span>Deliberate Practice Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#F3EFE6' }}>
            Training Progress
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: '#7E8092' }}>
            Empirical evidence from your personalized decision training sessions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/training')}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)',
              color: '#040406'
            }}
          >
            <Sparkles size={14} />
            <span>Start Practice Drill</span>
          </button>
        </div>
      </div>

      {/* Honest Distinction Banner */}
      <div
        className="p-5 rounded-2xl border flex items-start space-x-4"
        style={{ background: '#0B0C12', borderColor: '#181A24' }}
      >
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#60A5FA' }} />
        <div className="text-xs leading-relaxed space-y-1" style={{ color: '#9CA3AF' }}>
          <p className="font-semibold text-[#F3EFE6]">
            Training Improvement vs. Real Gameplay Impact
          </p>
          <p>
            Metrics on this page measure <strong className="text-neutral-300">Training Position Success Rate</strong> on selected mistake positions. 
            Genuine chess improvement is marked when future synced Chess.com games show an empirical decline in Centipawn Loss (CPL) and fewer blunders in these specific categories.
          </p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          className="p-4 rounded-2xl border"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-medium text-neutral-500 mb-1">Sessions Completed</div>
          <div className="text-2xl font-black text-[#F3EFE6]">
            {progress?.totalSessionsCompleted || 0}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Full drills finished</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-medium text-neutral-500 mb-1">Positions Attempted</div>
          <div className="text-2xl font-black text-[#F3EFE6]">
            {progress?.totalPositionsAttempted || 0}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Real game decisions</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-medium text-neutral-500 mb-1">Positions Solved</div>
          <div className="text-2xl font-black" style={{ color: '#4ADE80' }}>
            {progress?.totalPositionsSolved || 0}
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Matches Stockfish / Peak</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-medium text-neutral-500 mb-1">Training Success Rate</div>
          <div className="text-2xl font-black" style={{ color: '#C5A059' }}>
            {Math.round(progress?.overallSuccessRate || 0)}%
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Accuracy on drills</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-medium text-neutral-500 mb-1">Active Streak</div>
          <div className="flex items-center space-x-1.5 text-2xl font-black text-[#F3EFE6]">
            <span>{progress?.streakDays || 0}</span>
            <Flame size={18} className="text-amber-500" />
          </div>
          <div className="text-[10px] text-neutral-500 mt-1">Days practiced</div>
        </div>

        <div
          className="p-4 rounded-2xl border"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-medium text-neutral-500 mb-1">Adaptive Difficulty</div>
          <div className="text-sm font-black uppercase tracking-wider mt-1" style={{ color: '#C5A059' }}>
            {progress?.currentDifficulty || 'INTERMEDIATE'}
          </div>
          <div className="text-[10px] text-neutral-500 mt-2">Adjusts dynamically</div>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#F3EFE6]">Category Mastery & Drill Accuracy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(CATEGORY_META).map(([key, meta]) => {
            const Icon = meta.icon;
            const stats = categoryStats[key] || { attempted: 0, solved: 0, successRate: 0 };
            const rate = Math.round(stats.successRate || 0);

            return (
              <div
                key={key}
                className="p-5 rounded-2xl border transition-all"
                style={{ background: '#0B0C12', borderColor: '#181A24' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="p-2 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)', color: meta.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#F3EFE6]">{meta.label}</div>
                      <div className="text-[10px] text-neutral-500">
                        {stats.attempted} attempted • {stats.solved} solved
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-[#F3EFE6]">{rate}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#181A24' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${rate}%`,
                      background: meta.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recurring Weakness Progression */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#F3EFE6]">Targeted Weakness Evidence</h2>
          <span className="text-xs text-neutral-500">From Chess DNA & Move Centipawn Loss</span>
        </div>

        {weaknessData?.topWeaknesses && weaknessData.topWeaknesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weaknessData.topWeaknesses.map((w, idx) => {
              const prog = weaknessStats[w] || { attempted: 0, solved: 0, reductionPct: 0 };
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border flex flex-col justify-between space-y-3"
                  style={{ background: '#0B0C12', borderColor: '#181A24' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        Weakness #{idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-[#F3EFE6] mt-0.5">{w}</h3>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{
                        background: prog.attempted > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                        color: prog.attempted > 0 ? '#4ADE80' : '#7E8092'
                      }}
                    >
                      {prog.attempted > 0 ? `${prog.solved}/${prog.attempted} Drills Solved` : 'Needs Practice'}
                    </span>
                  </div>

                  <div className="text-xs text-neutral-400">
                    {prog.attempted > 0 ? (
                      <span>
                        Practiced in {prog.attempted} training positions. Continue focused drills to reinforce alternate candidate evaluations.
                      </span>
                    ) : (
                      <span>
                        Identified from your game history. Dedicated drills recommended to bridge the Current vs Peak Self decision gap.
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="p-6 rounded-2xl border text-center text-xs text-neutral-500"
            style={{ background: '#0B0C12', borderColor: '#181A24' }}
          >
            No recurring weaknesses identified yet. Synchronize more Chess.com games to generate DNA weakness metrics.
          </div>
        )}
      </div>

      {/* Recent Training Session History */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#F3EFE6]">Recent Completed Sessions</h2>
        {sessionHistory && sessionHistory.length > 0 ? (
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#181A24', background: '#0B0C12' }}>
            <div className="divide-y divide-[#181A24]">
              {sessionHistory.map((s) => (
                <div
                  key={s.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#141622]/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-[#F3EFE6]">{s.title}</span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                        style={{ background: '#141622', color: '#C5A059', border: '1px solid #181A24' }}
                      >
                        {s.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-neutral-500">
                      <span>Difficulty: {s.difficulty}</span>
                      <span>•</span>
                      <span>
                        {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-xs text-neutral-500">Session Score</div>
                      <div
                        className="text-lg font-black"
                        style={{ color: s.score >= 60 ? '#4ADE80' : '#C5A059' }}
                      >
                        {s.score}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="p-8 rounded-2xl border text-center space-y-3"
            style={{ background: '#0B0C12', borderColor: '#181A24' }}
          >
            <Calendar className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs text-neutral-400">
              No completed training sessions recorded yet.
            </p>
            <button
              onClick={() => navigate('/training')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#F3EFE6]"
              style={{ background: '#141622', border: '1px solid #181A24' }}
            >
              Start First Drill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
