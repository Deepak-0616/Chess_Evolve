import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ShieldCheck,
  TrendingUp,
  Brain,
  Zap,
  Lock,
  ArrowRight,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../api/client';

export const RetrainingDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [activating, setActivating] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get('/models/retrain/status');
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch retrain status:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (dryRun = false) => {
    setTriggering(true);
    setActionMessage(null);
    setError(null);
    try {
      const res = await apiClient.post('/models/retrain/trigger', { dryRun });
      setActionMessage(dryRun ? 'Dry run retraining triggered! Monitoring progress...' : 'Continuous retraining pipeline triggered!');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleActivate = async () => {
    if (!data?.job?.currentSelfModelId || !data?.job?.peakSelfModelId) return;
    setActivating(true);
    setActionMessage(null);
    setError(null);
    try {
      const res = await apiClient.post('/models/retrain/activate', {
        currentModelId: data.job.currentSelfModelId,
        peakModelId: data.job.peakSelfModelId,
        jobId: data.job.id,
      });
      setActionMessage('Atomic activation succeeded! Candidate models are now ACTIVE.');
      fetchStatus();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setActivating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D4AF37]" />
        Loading continuous retraining pipeline status...
      </div>
    );
  }

  const job = data?.job;
  const eligibility = data?.eligibility;
  const activeCurrent = data?.activeModels?.find((m) => m.modelType === 'CURRENT_SELF');
  const activePeak = data?.activeModels?.find((m) => m.modelType === 'PEAK_SELF');

  const STAGES = [
    { key: 'DATASET', label: 'Dataset Gen', pct: 20 },
    { key: 'TRAIN_CURRENT', label: 'Train Current Self', pct: 40 },
    { key: 'GATE_CURRENT', label: 'Current Gate', pct: 60 },
    { key: 'TRAIN_PEAK', label: 'Train Peak Self', pct: 75 },
    { key: 'GATE_PEAK', label: 'Peak Gate', pct: 90 },
    { key: 'ACTIVATION', label: 'Atomic Activation', pct: 100 },
  ];

  return (
    <div className="bg-[#121212] border border-[#2A2A2A] rounded-2xl p-6 space-y-6 shadow-xl">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#D4AF37]" />
            <h2 className="text-xl font-bold text-white tracking-wide">Continuous Model Retraining & Activation</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
              Phase 16 Pipeline
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Safe, versioned, evaluated, and conditionally activated machine learning pipeline.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleTrigger(true)}
            disabled={triggering || job?.status === 'RUNNING'}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#3A3A3A] bg-[#1A1A1A] hover:bg-[#252525] text-slate-300 transition-all disabled:opacity-50"
          >
            {triggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
            Test Pipeline (Dry Run)
          </button>

          <button
            onClick={() => handleTrigger(false)}
            disabled={triggering || job?.status === 'RUNNING' || eligibility?.status !== 'RETRAINING_ELIGIBLE'}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#D4AF37] to-[#AA8C2C] text-black hover:opacity-90 shadow-md transition-all disabled:opacity-40"
          >
            {triggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
            ⚡ Trigger Retraining
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {actionMessage}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          {error}
        </div>
      )}

      {/* Grid: Active Models vs Eligibility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Current Self */}
        <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>ACTIVE CURRENT SELF</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              ACTIVE
            </span>
          </div>
          <div className="text-2xl font-bold text-white">v{activeCurrent?.version || 1}</div>
          <div className="text-xs text-slate-400 mt-2 space-y-1">
            <div>Games Used: <span className="text-slate-200 font-semibold">{activeCurrent?.gamesUsed || 0}</span></div>
            <div>Positions: <span className="text-slate-200 font-semibold">{activeCurrent?.positionsUsed || 0}</span></div>
          </div>
        </div>

        {/* Active Peak Self */}
        <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>ACTIVE PEAK SELF</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              ACTIVE
            </span>
          </div>
          <div className="text-2xl font-bold text-white">v{activePeak?.version || 1}</div>
          <div className="text-xs text-slate-400 mt-2 space-y-1">
            <div>Depends on: <span className="text-slate-200 font-semibold">Current Self v{activeCurrent?.version || 1}</span></div>
            <div>Games Used: <span className="text-slate-200 font-semibold">{activePeak?.gamesUsed || 0}</span></div>
          </div>
        </div>

        {/* Retraining Eligibility */}
        <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>ELIGIBILITY CRITERIA</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              eligibility?.status === 'RETRAINING_ELIGIBLE'
                ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {eligibility?.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">
            +{eligibility?.newGamesSinceLastTrain || 0} <span className="text-sm font-normal text-slate-400">new games</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {eligibility?.eligibilityReasons?.[0] || 'Continuous data synchronization active.'}
          </div>
        </div>
      </div>

      {/* Progress & Stage Tracker */}
      {job && (
        <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                job.status === 'RUNNING' ? 'bg-amber-400 animate-pulse' :
                job.status === 'COMPLETED' ? 'bg-emerald-400' :
                job.status === 'REJECTED' ? 'bg-rose-500' : 'bg-slate-500'
              }`} />
              <span className="text-sm font-bold text-white">Job Stage: {job.stage || job.status}</span>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Progress: <span className="text-white font-bold">{job.progressPct || 0}%</span>
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#2A2A2A] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                job.status === 'REJECTED' ? 'bg-rose-500' :
                job.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#D4AF37] to-amber-400'
              }`}
              style={{ width: `${job.progressPct || 0}%` }}
            />
          </div>

          {/* Stage Badges */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2">
            {STAGES.map((s) => {
              const isPast = (job.progressPct || 0) >= s.pct;
              const isCurrent = (job.progressPct || 0) < s.pct && (job.progressPct || 0) >= s.pct - 20;
              return (
                <div
                  key={s.key}
                  className={`p-2 rounded-lg text-center text-[11px] font-semibold border ${
                    isPast
                      ? 'bg-emerald-950/30 text-emerald-300 border-emerald-800/40'
                      : isCurrent
                      ? 'bg-amber-950/30 text-amber-300 border-amber-800/40 animate-pulse'
                      : 'bg-[#121212] text-slate-500 border-[#222]'
                  }`}
                >
                  {s.label}
                </div>
              );
            })}
          </div>

          {/* Quality Gates Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-[#2A2A2A]">
            <div className="p-3 bg-[#121212] rounded-lg border border-[#222] flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Self Quality Gate:</span>
              <span className={`text-xs font-bold ${
                job.currentGatePassed === true ? 'text-emerald-400' :
                job.currentGatePassed === false ? 'text-rose-400' : 'text-slate-500'
              }`}>
                {job.currentGatePassed === true ? '✓ PASS' : job.currentGatePassed === false ? '✗ FAIL' : 'PENDING'}
              </span>
            </div>

            <div className="p-3 bg-[#121212] rounded-lg border border-[#222] flex items-center justify-between">
              <span className="text-xs text-slate-400">Peak Self Quality Gate:</span>
              <span className={`text-xs font-bold ${
                job.peakGatePassed === true ? 'text-emerald-400' :
                job.peakGatePassed === false ? 'text-rose-400' : 'text-slate-500'
              }`}>
                {job.peakGatePassed === true ? '✓ PASS' : job.peakGatePassed === false ? '✗ FAIL' : 'PENDING'}
              </span>
            </div>
          </div>

          {job.rejectionReason && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-lg text-xs text-rose-300">
              <p className="font-bold mb-1">Rejection Reason:</p>
              <p>{job.rejectionReason}</p>
            </div>
          )}

          {/* Manual Activation Button if Ready and Not Activated */}
          {job.status === 'COMPLETED' && !job.isActivated && (
            <div className="pt-2">
              <button
                onClick={handleActivate}
                disabled={activating}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all"
              >
                {activating ? 'Activating Candidate Models...' : '✓ Activate Verified Candidate Models (Current & Peak)'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Model Version History */}
      <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#D4AF37]" />
          Model Version Audit History
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-400">
            <thead className="bg-[#121212] text-slate-500 uppercase border-b border-[#2A2A2A]">
              <tr>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Games</th>
                <th className="py-2.5 px-3">Positions</th>
                <th className="py-2.5 px-3">Dependency</th>
                <th className="py-2.5 px-3">Activated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222]">
              {data?.allVersions?.map((v) => (
                <tr key={v.id} className="hover:bg-[#1a1a1a]">
                  <td className="py-2 px-3 font-semibold text-white">{v.modelType}</td>
                  <td className="py-2 px-3 font-bold text-[#D4AF37]">v{v.version}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      v.status === 'SUPERSEDED' ? 'bg-slate-800 text-slate-400' :
                      v.status === 'READY' ? 'bg-blue-500/20 text-blue-400' :
                      v.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {v.isActive ? 'ACTIVE' : v.status}
                    </span>
                  </td>
                  <td className="py-2 px-3">{v.gamesUsed}</td>
                  <td className="py-2 px-3">{v.positionsUsed}</td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                    {v.dependentModelVersionId ? `Current Self (${v.dependentModelVersionId.slice(0, 8)}...)` : '—'}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {v.activatedAt ? new Date(v.activatedAt).toLocaleString() : (v.supersededAt ? 'Superseded' : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
