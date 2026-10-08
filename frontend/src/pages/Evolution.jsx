import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Brain,
  History,
  Award,
  Loader2,
  Shield,
  Activity,
  Trophy,
  Zap,
  Target,
  Sparkles,
  Info,
  Calendar,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid
} from 'recharts';
import {
  getEvolutionOverview,
  getEvolutionTimeline,
  getEvolutionGameplay,
  generateEvolutionSnapshot
} from '../api';

const CATEGORY_COLORS = {
  TACTICAL: '#C5A059',
  DEFENSIVE: '#4ADE80',
  POSITIONAL: '#60A5FA',
  ENDGAME: '#F472B6',
  OPENING: '#FBBF24',
};

export const Evolution = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [quartiles, setQuartiles] = useState([]);
  const [generatingSnapshot, setGeneratingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'timeline' | 'correlation'

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [ovRes, timeRes, qRes] = await Promise.all([
        getEvolutionOverview().catch(() => ({ data: {} })),
        getEvolutionTimeline().catch(() => ({ data: { events: [] } })),
        getEvolutionGameplay().catch(() => ({ data: { quartiles: [] } })),
      ]);

      setOverview(ovRes.data || null);
      setTimeline(timeRes.data?.events || []);
      setQuartiles(qRes.data?.quartiles || []);
    } catch (err) {
      console.error('Failed to load evolution data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSnapshot = async () => {
    try {
      setGeneratingSnapshot(true);
      setSnapshotSuccess(null);
      await generateEvolutionSnapshot({ sourceType: 'MANUAL', notes: 'Manual checkpoint from UI' });
      setSnapshotSuccess('Historical snapshot created and permanently archived.');
      loadAllData();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setGeneratingSnapshot(false);
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
            Aggregating longitudinal game cohorts & deliberate training records...
          </p>
        </div>
      </div>
    );
  }

  if (!overview || !overview.sufficientData) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-[#F3EFE6]">Insufficient Data for Evolution Analysis</h2>
        <p className="text-sm text-neutral-400 max-w-md mx-auto">
          {overview?.message || 'Connect your Chess.com profile and synchronize your games to establish a historical baseline.'}
        </p>
      </div>
    );
  }

  const {
    cohorts,
    gameplayImprovement,
    trainingProgress,
    correlation,
    weaknessProgression,
    modelComparison,
    modelEligibility,
    evolutionScore,
    user
  } = overview;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#C5A059' }}>
            <TrendingUp size={14} />
            <span>Longitudinal Player Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#F3EFE6' }}>
            Player Evolution & Progress
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: '#7E8092' }}>
            Tracking genuine gameplay progression for @{user?.chessUsername} across {user?.totalAnalyzedGames} analyzed games.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleGenerateSnapshot}
            disabled={generatingSnapshot}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-[#181A24] disabled:opacity-50"
            style={{ background: '#141622', border: '1px solid #181A24', color: '#F3EFE6' }}
          >
            <RefreshCw size={13} className={generatingSnapshot ? 'animate-spin' : ''} />
            <span>Archive Snapshot</span>
          </button>
        </div>
      </div>

      {snapshotSuccess && (
        <div className="p-3 rounded-xl border flex items-center space-x-2 text-xs text-emerald-400"
          style={{ background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.2)' }}>
          <CheckCircle2 size={14} />
          <span>{snapshotSuccess}</span>
        </div>
      )}

      {/* Mandatory Honest Metric Distinction Banner */}
      <div
        className="p-5 rounded-2xl border flex items-start space-x-4"
        style={{ background: '#0B0C12', borderColor: '#181A24' }}
      >
        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#60A5FA' }} />
        <div className="text-xs leading-relaxed space-y-1" style={{ color: '#9CA3AF' }}>
          <p className="font-semibold text-[#F3EFE6]">
            Gameplay Improvement vs. Deliberate Training Practice
          </p>
          <p>
            <strong className="text-neutral-300">Gameplay Improvement</strong> is evaluated exclusively from newly analyzed Chess.com games (measuring reductions in Centipawn Loss and blunder rates). 
            <strong className="text-neutral-300"> Training Improvement</strong> measures your accuracy on targeted decision drills. 
            The system tracks correlation between deliberate practice and subsequent games without asserting unsupported causal claims.
          </p>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gameplay CPL Reduction */}
        <div
          className="p-6 rounded-2xl border relative overflow-hidden"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#60A5FA' }}>
            Gameplay Avg CPL
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#F3EFE6]">
              {cohorts.recent?.metrics?.avgCpl}
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: gameplayImprovement.cplChangePct <= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                color: gameplayImprovement.cplChangePct <= 0 ? '#4ADE80' : '#EF4444',
              }}
            >
              {gameplayImprovement.cplChangePct > 0 ? '+' : ''}
              {gameplayImprovement.cplChangePct}%
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            Baseline: {cohorts.baseline?.metrics?.avgCpl} cp (N = {gameplayImprovement.sampleSizeBaseline} decisions)
          </p>
        </div>

        {/* Gameplay Blunder Rate */}
        <div
          className="p-6 rounded-2xl border relative overflow-hidden"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#4ADE80' }}>
            Gameplay Blunder Rate
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#F3EFE6]">
              {cohorts.recent?.metrics?.blunderRate}%
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                background: gameplayImprovement.blunderRateChangePct <= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                color: gameplayImprovement.blunderRateChangePct <= 0 ? '#4ADE80' : '#EF4444',
              }}
            >
              {gameplayImprovement.blunderRateChangePct > 0 ? '+' : ''}
              {gameplayImprovement.blunderRateChangePct}%
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            Baseline: {cohorts.baseline?.metrics?.blunderRate}% of moves
          </p>
        </div>

        {/* Training Position Success Rate */}
        <div
          className="p-6 rounded-2xl border relative overflow-hidden"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#C5A059' }}>
            Training Drill Success
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#C5A059]">
              {Math.round(trainingProgress?.trainingSuccessRate || 0)}%
            </span>
            <span className="text-xs text-neutral-500">
              ({trainingProgress?.totalPositionsSolved}/{trainingProgress?.totalPositionsAttempted})
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            Deliberate practice across {trainingProgress?.totalSessionsCompleted} sessions
          </p>
        </div>

        {/* Retraining Eligibility */}
        <div
          className="p-6 rounded-2xl border relative overflow-hidden"
          style={{ background: '#0B0C12', borderColor: '#181A24' }}
        >
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#A78BFA' }}>
            Model Update Status
          </div>
          <div className="text-lg font-black text-[#F3EFE6] truncate mt-1">
            {modelEligibility?.status === 'RETRAINING_ELIGIBLE' ? (
              <span className="text-emerald-400">Retraining Eligible</span>
            ) : modelEligibility?.status === 'NEW_DATA_AVAILABLE' ? (
              <span className="text-amber-400">New Data Available</span>
            ) : (
              <span className="text-neutral-400">Up to Date</span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 mt-2">
            +{modelEligibility?.newGamesSinceLastTrain || 0} games since last model training
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b" style={{ borderColor: '#181A24' }}>
        {[
          { id: 'overview', label: 'Longitudinal Cohorts & Charts' },
          { id: 'correlation', label: 'Training → Gameplay Correlation' },
          { id: 'timeline', label: 'Milestone Timeline' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-xs font-bold transition-all border-b-2"
            style={{
              borderColor: activeTab === tab.id ? '#C5A059' : 'transparent',
              color: activeTab === tab.id ? '#F3EFE6' : '#7E8092',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Longitudinal Quartiles & Charts */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real CPL Reduction Across Quartiles */}
            <div
              className="p-6 rounded-2xl border space-y-4"
              style={{ background: '#101010', borderColor: '#1F1F1F' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-200">
                    Average Centipawn Loss Trajectory
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Chronological quartiles across {user?.totalAnalyzedGames} analyzed games
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  {gameplayImprovement.cplChangePct}% Total Delta
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quartiles}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="cohort" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#2A2A2A', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgCpl"
                      name="Average CPL"
                      stroke="#60A5FA"
                      strokeWidth={3}
                      dot={{ fill: '#60A5FA', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Error Rates vs Best Move Rate */}
            <div
              className="p-6 rounded-2xl border space-y-4"
              style={{ background: '#101010', borderColor: '#1F1F1F' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-200">
                    Blunder Rate vs. Best Move Rate (%)
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Tactical discipline progression per chronological cohort
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quartiles}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="cohort" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#141414', borderColor: '#2A2A2A', borderRadius: '12px', fontSize: '11px' }}
                    />
                    <Bar dataKey="blunderRate" name="Blunder Rate %" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bestMoveRate" name="Engine Best Move %" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Current vs Peak Behavioral Gap */}
          {modelComparison && (
            <div
              className="p-6 rounded-2xl border space-y-6"
              style={{ background: '#101010', borderColor: '#1F1F1F' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-fuchsia-400 uppercase tracking-wider mb-1">
                    <Trophy size={14} />
                    <span>Behavioral Gap Analysis</span>
                  </div>
                  <h2 className="text-lg font-bold text-neutral-100">
                    Current Self vs. Peak Self Divergence
                  </h2>
                </div>
                {evolutionScore !== null && (
                  <div className="text-right">
                    <span className="text-xs text-neutral-500">Evolution Score</span>
                    <div className="text-2xl font-black text-fuchsia-400">+{evolutionScore}%</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border" style={{ background: '#141414', borderColor: '#222' }}>
                  <div className="text-xs text-neutral-400 mb-1">Top-1 Accuracy Gap</div>
                  <div className="text-2xl font-black text-neutral-100">
                    +{modelComparison.behavioralGap.top1Delta}%
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Current Self: {modelComparison.currentSelf.top1Accuracy}% • Peak Self: {modelComparison.peakSelf.top1Accuracy}%
                  </p>
                </div>

                <div className="p-4 rounded-xl border" style={{ background: '#141414', borderColor: '#222' }}>
                  <div className="text-xs text-neutral-400 mb-1">Weakness Reduction Rate</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {modelComparison.behavioralGap.weaknessReductionRate}%
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Fewer tactical mistakes selected by Peak Self
                  </p>
                </div>

                <div className="p-4 rounded-xl border" style={{ background: '#141414', borderColor: '#222' }}>
                  <div className="text-xs text-neutral-400 mb-1">Style Preservation Rate</div>
                  <div className="text-2xl font-black text-amber-400">
                    {modelComparison.behavioralGap.stylePreservationRate}%
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Maintains user personality without generic style collapse
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Weakness Trajectories */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-200">DNA Weakness Trajectories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weaknessProgression.map((w, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border space-y-3"
                  style={{ background: '#101010', borderColor: '#1F1F1F' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        {w.category} Domain
                      </span>
                      <h3 className="text-sm font-bold text-neutral-100 mt-0.5">{w.weakness}</h3>
                    </div>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background:
                          w.status === 'IMPROVING'
                            ? 'rgba(74,222,128,0.1)'
                            : w.status === 'STABLE'
                            ? 'rgba(234,179,8,0.1)'
                            : 'rgba(239,68,68,0.1)',
                        color:
                          w.status === 'IMPROVING'
                            ? '#4ADE80'
                            : w.status === 'STABLE'
                            ? '#EAB308'
                            : '#EF4444',
                      }}
                    >
                      {w.status}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400">{w.trendDescription}</p>

                  <div className="pt-2 border-t flex items-center justify-between text-[11px] text-neutral-500" style={{ borderColor: '#1A1A1A' }}>
                    <span>Baseline Error: {w.baselineErrorRate}%</span>
                    <span>→</span>
                    <span className="text-neutral-300 font-semibold">Recent Error: {w.recentErrorRate}%</span>
                    <span>•</span>
                    <span>N = {w.sampleSize}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Training -> Gameplay Correlation */}
      {activeTab === 'correlation' && (
        <div className="space-y-6">
          <div
            className="p-5 rounded-2xl border text-xs leading-relaxed space-y-2"
            style={{ background: '#101010', borderColor: '#1F1F1F', color: '#9CA3AF' }}
          >
            <p className="font-bold text-neutral-200">Scientific Correlation Framework</p>
            <p>{correlation.disclaimer}</p>
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#1F1F1F', background: '#0E0E0E' }}>
            <table className="w-full text-left text-xs">
              <thead className="border-b" style={{ borderColor: '#1F1F1F', background: '#141414', color: '#888' }}>
                <tr>
                  <th className="p-4">Category</th>
                  <th className="p-4">Training Drills</th>
                  <th className="p-4">Drill Success</th>
                  <th className="p-4">Baseline CPL</th>
                  <th className="p-4">Recent CPL</th>
                  <th className="p-4">Gameplay CPL Delta</th>
                  <th className="p-4">Sample Size</th>
                  <th className="p-4">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-300">
                {correlation.categories.map((c) => (
                  <tr key={c.category} className="hover:bg-neutral-900/30">
                    <td className="p-4 font-bold text-neutral-100">{c.category}</td>
                    <td className="p-4">{c.trainingPositionsAttempted} drills</td>
                    <td className="p-4 font-bold" style={{ color: '#C5A059' }}>
                      {c.trainingPositionsAttempted > 0 ? `${c.trainingSuccessRate}%` : '—'}
                    </td>
                    <td className="p-4">{c.gameplayBaselineCpl} cp</td>
                    <td className="p-4">{c.gameplayRecentCpl} cp</td>
                    <td className="p-4 font-bold">
                      <span
                        style={{
                          color: c.cplChangePct <= 0 ? '#4ADE80' : '#EF4444',
                        }}
                      >
                        {c.cplChangePct > 0 ? '+' : ''}
                        {c.cplChangePct}%
                      </span>
                    </td>
                    <td className="p-4 text-neutral-500">N = {c.gameplaySampleSize}</td>
                    <td className="p-4">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          background: c.evidenceStatus === 'SUFFICIENT' ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                          color: c.evidenceStatus === 'SUFFICIENT' ? '#4ADE80' : '#888',
                        }}
                      >
                        {c.evidenceStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Milestone Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          <div className="relative pl-6 border-l-2 space-y-8" style={{ borderColor: '#181A24' }}>
            {timeline.map((ev, idx) => (
              <div key={idx} className="relative group">
                {/* Dot */}
                <div
                  className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-all"
                  style={{
                    background: '#040406',
                    borderColor:
                      ev.type === 'MODEL_TRAINED'
                        ? '#A78BFA'
                        : ev.type === 'TRAINING_SESSION'
                        ? '#C5A059'
                        : '#4ADE80',
                  }}
                />

                <div
                  className="p-5 rounded-2xl border space-y-2 transition-all hover:bg-[#141622]/40"
                  style={{ background: '#0B0C12', borderColor: '#181A24' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#F3EFE6]">{ev.title}</span>
                    <span className="text-[11px] text-neutral-500">
                      {new Date(ev.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Evolution;
