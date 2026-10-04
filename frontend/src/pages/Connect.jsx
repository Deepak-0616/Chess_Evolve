import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight, Shield, RefreshCw } from 'lucide-react';

export const Connect = () => {
  const [usernameInput, setUsernameInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [syncState, setSyncState] = useState(null);
  const [connectedProfile, setConnectedProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if profile is already connected
    apiClient.get('/chess/profile')
      .then((res) => {
        if (res.data.chessProfile) {
          setConnectedProfile(res.data.chessProfile);
          if (res.data.chessProfile.syncStatus === 'COMPLETED') {
            navigate('/dashboard');
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setIsConnecting(true);
    setErrorMsg('');

    try {
      const res = await apiClient.post('/chess/profile/connect', {
        chessUsername: usernameInput.trim(),
      });

      setConnectedProfile(res.data.chessProfile);
      startStatusPolling();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to connect Chess.com profile');
      setIsConnecting(false);
    }
  };

  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get('/chess/sync/active');
        setSyncState(res.data.progress);

        if (res.data.status === 'COMPLETED') {
          clearInterval(interval);
          setIsConnecting(false);
          setTimeout(() => navigate('/dashboard'), 1500);
        } else if (res.data.status === 'FAILED') {
          clearInterval(interval);
          setIsConnecting(false);
          setErrorMsg(res.data.progress?.error || 'Synchronization process encountered an error');
        }
      } catch (err) {
        // Continue polling
      }
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-white mb-3">
          Connect Your Chess.com Account
        </h1>
        <p className="text-slate-400 text-sm">
          Enter your public Chess.com username. We will import your complete retrievable game history, run Stockfish analysis, and train your personalized AI models.
        </p>
      </div>

      {!connectedProfile ? (
        <div className="p-8 rounded-2xl glass-panel shadow-2xl">
          <form onSubmit={handleConnect} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Chess.com Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. MagnusCarlsen"
                className="w-full px-4 py-3.5 rounded-xl bg-surface border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isConnecting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-base shadow-glow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying Profile & Initiating Sync...</span>
                </>
              ) : (
                <>
                  <span>Connect & Synchronize Account</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="p-8 rounded-2xl glass-panel shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-white/10">
            <img
              src={connectedProfile.avatarUrl || 'https://images.chesscomfiles.com/uploads/v1/user/0.2b6d13d7.160x160o.2c1d2e1f.png'}
              alt={connectedProfile.chessUsername}
              className="w-16 h-16 rounded-full border-2 border-emerald-500/50"
            />
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center space-x-2">
                <span>{connectedProfile.chessUsername}</span>
                {connectedProfile.title && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold">
                    {connectedProfile.title}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Connected to authenticated user profile</p>
            </div>
          </div>

          {/* Real Live Sync Progress Tracker */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              Live Synchronization Status
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-white/5">
                <span className="text-sm text-slate-300">Profile Verification</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-white/5">
                <span className="text-sm text-slate-300">Archives Discovery</span>
                {syncState?.archivesDiscovered ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-white/5">
                <div>
                  <span className="text-sm text-slate-300 block">Games Imported</span>
                  <span className="text-xs text-slate-500">
                    {syncState?.gamesImported || 0} games discovered & stored
                  </span>
                </div>
                {syncState?.stage === 'GAME_ANALYSIS' || syncState?.stage === 'COMPLETED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-white/5">
                <div>
                  <span className="text-sm text-slate-300 block">Stockfish Position Analysis</span>
                  <span className="text-xs text-slate-500">
                    {syncState?.positionsAnalyzed || 0} plies analyzed
                  </span>
                </div>
                {syncState?.stage === 'DNA_GENERATION' || syncState?.stage === 'COMPLETED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface border border-white/5">
                <span className="text-sm text-slate-300">Chess DNA & PyTorch AI Models</span>
                {syncState?.stage === 'COMPLETED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-glow transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
