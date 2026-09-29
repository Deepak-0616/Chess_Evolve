import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Loader2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { ApiClient } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export const ConnectModal = ({ isOpen, onClose, onSuccess }) => {
  const { refreshUser } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [activeJobId, setActiveJobId] = useState(null);
  const [stage, setStage] = useState("IDLE");
  const [progressDetails, setProgressDetails] = useState(null);

  const handleConnect = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStage("CONNECTING");

    try {
      const res = await ApiClient.connectChessProfile(username);
      setActiveJobId(res.sync.jobId);
      setStage("FETCHING_ARCHIVES");
    } catch (err) {
      if (err.code === "CHESS_PROFILE_NOT_FOUND") {
        setError("We couldn't find this Chess.com profile. Please check the spelling.");
      } else {
        setError(err.message || "Failed to connect profile.");
      }
      setLoading(false);
      setStage("IDLE");
    }
  };

  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const jobStatus = await ApiClient.getSyncStatus(activeJobId);
        setStage(jobStatus.currentStage);
        setProgressDetails(jobStatus.progress);

        if (jobStatus.status === "COMPLETED") {
          clearInterval(interval);
          setLoading(false);
          await refreshUser();
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1000);
        } else if (jobStatus.status === "FAILED") {
          clearInterval(interval);
          setLoading(false);
          setError(jobStatus.error || "Game synchronization failed.");
        }
      } catch (err) {
        console.warn("Polling status error:", err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeJobId]);

  const steps = [
    { key: "FETCHING_PROFILE", label: "Connecting Chess.com & validating player profile" },
    { key: "FETCHING_ARCHIVES", label: "Discovering public game archives" },
    { key: "IMPORTING_GAMES", label: `Importing & parsing game PGNs (${progressDetails?.gamesImported || 0} games)` },
    { key: "ANALYZING_GAMES", label: "Generating Chess DNA & identifying playing style" },
    { key: "COMPLETED", label: "Peak Self AI created & ready for play" },
  ];

  const getStepStatus = (stepKey) => {
    if (stage === "COMPLETED") return "DONE";
    if (stage === stepKey) return "PROCESSING";
    const keys = steps.map((s) => s.key);
    const currIdx = keys.indexOf(stage);
    const stepIdx = keys.indexOf(stepKey);
    if (stepIdx < currIdx) return "DONE";
    return "PENDING";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-gold-500/30 bg-dark-800 p-6 shadow-2xl shadow-gold-500/10">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 border border-gold-500/30">
            <Sparkles className="h-6 w-6 text-gold-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Connect Chess.com Profile</h2>
          <p className="mt-1 text-xs text-gray-400">
            We will analyze your available public game history to construct your Chess DNA and Peak Self AI.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center space-x-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && stage === "IDLE" ? (
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300">Chess.com Username</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. hikaru or your_username"
                  className="w-full rounded-xl border border-white/10 bg-dark-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Only public game history will be analyzed. No password or personal credentials required.
              </p>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 py-3 text-sm font-bold text-dark-900 shadow-lg shadow-gold-500/20 transition-all hover:shadow-gold-500/40"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Analyze My Games</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-400 text-center">
              AI Evolution Progress
            </p>

            <div className="space-y-3">
              {steps.map((step) => {
                const status = getStepStatus(step.key);
                return (
                  <div
                    key={step.key}
                    className={`flex items-center space-x-3 rounded-xl border p-3 transition-all ${
                      status === "DONE"
                        ? "border-green-500/30 bg-green-500/5 text-green-400"
                        : status === "PROCESSING"
                        ? "border-gold-500/50 bg-gold-500/10 text-gold-300 shadow-sm"
                        : "border-white/5 bg-dark-900/50 text-gray-400"
                    }`}
                  >
                    {status === "DONE" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    ) : status === "PROCESSING" ? (
                      <Loader2 className="h-5 w-5 text-gold-400 animate-spin shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-gray-600 shrink-0" />
                    )}
                    <span className="text-xs font-medium">{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
