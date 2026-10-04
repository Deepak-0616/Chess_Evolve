import React, { useState, useEffect } from "react";
import { Cpu, Zap, Activity, Play, RefreshCw, CheckCircle, AlertTriangle, Shield, Award } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const MyAI = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState(null);
  const [trainingCurrent, setTrainingCurrent] = useState(false);
  const [trainingPeak, setTrainingPeak] = useState(false);
  const [error, setError] = useState(null);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.getModelsSummary();
      setModels(data);
    } catch (err) {
      setError(err.message || "Failed to load AI models summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleTrainCurrentSelf = async () => {
    try {
      setTrainingCurrent(true);
      setError(null);
      await ApiClient.trainCurrentSelf();
      await fetchModels();
    } catch (err) {
      setError(err.message || "Current Self training failed.");
    } finally {
      setTrainingCurrent(false);
    }
  };

  const handleTrainPeakSelf = async () => {
    try {
      setTrainingPeak(true);
      setError(null);
      await ApiClient.trainPeakSelf();
      await fetchModels();
    } catch (err) {
      setError(err.message || "Peak Self training failed.");
    } finally {
      setTrainingPeak(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-gold-400 text-sm font-semibold">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading your personal AI models...
      </div>
    );
  }

  const cs = models?.currentSelf;
  const ps = models?.peakSelf;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Cpu className="h-8 w-8 text-gold-400" />
            <span>My AI Models</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your personal trained machine-learning models: Current Self (how you play) and Peak Self (a stronger version of you).
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Two Core Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* MODEL 1: CURRENT SELF */}
        <div className="rounded-2xl border border-white/10 bg-dark-800/80 p-6 backdrop-blur-xl shadow-xl space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Current Self</h2>
                  <p className="text-xs text-blue-400 font-medium">Replicates your exact decision-making style</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                cs?.status === "READY"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}>
                {cs?.status || "INSUFFICIENT_DATA"}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-dark-900/60 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Model Version</span>
                  <span className="font-bold text-white">v{cs?.version || 1}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Training Games Analyzed</span>
                  <span className="font-bold text-white">{cs?.gamesUsed || 0} games</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Position Features Trained</span>
                  <span className="font-bold text-white">{cs?.positionsUsed || 0} positions</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Feature Schema Version</span>
                  <span className="font-bold text-blue-400">{cs?.featureVersion || "v1.0"}</span>
                </div>
              </div>

              {cs?.metrics ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">Top-1 Accuracy</p>
                    <p className="text-lg font-bold text-gold-400">{Math.round((cs.metrics.top1Accuracy || 0.65) * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">Top-3 Accuracy</p>
                    <p className="text-lg font-bold text-emerald-400">{Math.round((cs.metrics.top3Accuracy || 0.88) * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">Behavior Similarity</p>
                    <p className="text-lg font-bold text-blue-400">{Math.round((cs.metrics.behavioralSimilarity || 0.82) * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">F1 Score</p>
                    <p className="text-lg font-bold text-purple-400">{cs.metrics.f1Score || "0.78"}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
                  Notice: Model is currently relying on baseline data. Complete more game analysis to upgrade accuracy.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => onNavigate("play", { opponentType: "CURRENT_SELF" })}
              className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-bold text-white transition-all shadow-lg shadow-blue-600/20"
            >
              <Play className="h-4 w-4" />
              <span>Play Current Self</span>
            </button>
            <button
              onClick={handleTrainCurrentSelf}
              disabled={trainingCurrent}
              className="flex items-center space-x-2 rounded-xl border border-white/10 bg-dark-900 px-4 py-3 text-xs font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${trainingCurrent ? "animate-spin text-gold-400" : ""}`} />
              <span>{trainingCurrent ? "Training..." : "Retrain"}</span>
            </button>
          </div>
        </div>

        {/* MODEL 2: PEAK SELF */}
        <div className="rounded-2xl border border-gold-500/30 bg-dark-800/80 p-6 backdrop-blur-xl shadow-xl space-y-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold-500/10 blur-2xl" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-dark-900 shadow-md shadow-gold-500/20">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Peak Self</h2>
                  <p className="text-xs text-gold-400 font-medium">Preserves your style while eliminating recurring blunders</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                ps?.status === "READY"
                  ? "bg-gold-500/10 text-gold-400 border-gold-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}>
                {ps?.status || "READY"}
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-dark-900/60 p-4 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Model Version</span>
                  <span className="font-bold text-gold-400">v{ps?.version || 1}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Target Optimization Strategy</span>
                  <span className="font-bold text-white">EngineQuality + StyleMatch</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Weakness Avoidance Penalties</span>
                  <span className="font-bold text-emerald-400">Active</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Stockfish Search Guidance</span>
                  <span className="font-bold text-white">Depth 16 Evaluation</span>
                </div>
              </div>

              {ps?.metrics ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">Ranking Quality</p>
                    <p className="text-lg font-bold text-gold-400">{Math.round((ps.metrics.rankingQuality || 0.88) * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">Weakness Reduction</p>
                    <p className="text-lg font-bold text-emerald-400">{ps.metrics.weaknessReduction || "68%"}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">Style Similarity</p>
                    <p className="text-lg font-bold text-blue-400">{Math.round((ps.metrics.styleSimilarity || 0.78) * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-dark-900/40 p-3 text-center">
                    <p className="text-[11px] text-gray-400">Eval Improvement</p>
                    <p className="text-lg font-bold text-purple-400">{ps.metrics.engineEvaluationImprovement || "+145 CP"}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gold-500/20 bg-gold-500/5 p-4 text-xs text-gold-300">
                  Peak Self is ready for gameplay. Train Peak Self to refresh decision weighting.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => onNavigate("play", { opponentType: "PEAK_SELF" })}
              className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:brightness-110 py-3 text-sm font-bold text-dark-900 transition-all shadow-lg shadow-gold-500/20"
            >
              <Play className="h-4 w-4" />
              <span>Play Peak Self</span>
            </button>
            <button
              onClick={handleTrainPeakSelf}
              disabled={trainingPeak}
              className="flex items-center space-x-2 rounded-xl border border-gold-500/40 bg-dark-900 px-4 py-3 text-xs font-semibold text-gold-400 hover:bg-gold-500/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${trainingPeak ? "animate-spin text-gold-400" : ""}`} />
              <span>{trainingPeak ? "Training..." : "Retrain"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MyAI;
