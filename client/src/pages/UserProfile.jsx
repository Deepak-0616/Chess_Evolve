import React, { useState, useEffect } from "react";
import { User, Shield, RefreshCw, CheckCircle, AlertTriangle, Eye, Lock, Globe } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [aiVisibility, setAiVisibility] = useState("PUBLIC");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.getUserProfile();
      setProfile(data);
      setDisplayName(data.displayName || "");
      if (data.chessProfile?.aiVisibility) {
        setAiVisibility(data.chessProfile.aiVisibility);
      }
    } catch (err) {
      setError(err.message || "Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await ApiClient.updateUserProfile({ displayName, aiVisibility });
      setProfile(updated);
      setMessage("Profile settings updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-gold-400 text-sm font-semibold">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading profile settings...
      </div>
    );
  }

  const cp = profile?.chessProfile;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <User className="h-8 w-8 text-blue-400" />
          <span>Profile & Settings</span>
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your identity, connected Chess.com account, and AI Arena model sharing preferences.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Account Info Card */}
        <div className="rounded-2xl border border-white/10 bg-dark-800/80 p-6 backdrop-blur-xl shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="h-5 w-5 text-gold-400" />
            <span>Account Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-300">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-dark-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300">Email Address</label>
              <input
                type="email"
                disabled
                value={profile?.email || ""}
                className="mt-1 w-full rounded-xl border border-white/10 bg-dark-900/50 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Connected Chess.com Profile */}
        <div className="rounded-2xl border border-white/10 bg-dark-800/80 p-6 backdrop-blur-xl shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-gold-400" />
            <span>Connected Chess.com Identity</span>
          </h2>

          {cp ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-dark-900/60 p-4 border border-white/5 gap-4">
              <div className="flex items-center space-x-3">
                {cp.avatarUrl ? (
                  <img src={cp.avatarUrl} alt={cp.username} className="h-12 w-12 rounded-xl object-cover border border-white/10" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500/10 border border-gold-500/30 font-bold text-gold-400 text-lg">
                    {cp.username[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">♟ @{cp.username}</span>
                    {cp.title && <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-gold-400 border border-gold-500/30">{cp.title}</span>}
                  </div>
                  <p className="text-xs text-gray-400">{cp.gamesImported} games imported</p>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-right">
                <p>Last Synced: {cp.lastSyncedAt ? new Date(cp.lastSyncedAt).toLocaleString() : "Recently"}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-300">
              No Chess.com username connected yet. Connect your account to enable game synchronization and AI DNA generation.
            </div>
          )}
        </div>

        {/* AI Model Visibility Settings */}
        <div className="rounded-2xl border border-white/10 bg-dark-800/80 p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-400" />
              <span>AI Arena Visibility & Model Sharing</span>
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Control whether other Chess Evolve users can discover your AI profile and challenge your Current Self / Peak Self models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setAiVisibility("PUBLIC")}
              className={`cursor-pointer rounded-xl p-4 border transition-all ${
                aiVisibility === "PUBLIC"
                  ? "border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                  : "border-white/10 bg-dark-900/60 hover:border-white/20"
              }`}
            >
              <div className="flex items-center space-x-2 text-purple-400 mb-2">
                <Globe className="h-5 w-5" />
                <span className="font-bold text-sm">Public</span>
              </div>
              <p className="text-xs text-gray-400">
                Anyone can find your AI profile in search and play against your Current Self & Peak Self models.
              </p>
            </div>

            <div
              onClick={() => setAiVisibility("DISCOVERABLE")}
              className={`cursor-pointer rounded-xl p-4 border transition-all ${
                aiVisibility === "DISCOVERABLE"
                  ? "border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                  : "border-white/10 bg-dark-900/60 hover:border-white/20"
              }`}
            >
              <div className="flex items-center space-x-2 text-blue-400 mb-2">
                <Eye className="h-5 w-5" />
                <span className="font-bold text-sm">Discoverable</span>
              </div>
              <p className="text-xs text-gray-400">
                Your AI profile shows in search results, but players need your direct link to start play sessions.
              </p>
            </div>

            <div
              onClick={() => setAiVisibility("PRIVATE")}
              className={`cursor-pointer rounded-xl p-4 border transition-all ${
                aiVisibility === "PRIVATE"
                  ? "border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                  : "border-white/10 bg-dark-900/60 hover:border-white/20"
              }`}
            >
              <div className="flex items-center space-x-2 text-amber-400 mb-2">
                <Lock className="h-5 w-5" />
                <span className="font-bold text-sm">Private</span>
              </div>
              <p className="text-xs text-gray-400">
                Only you can view and play against your personal Current Self & Peak Self models.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 font-bold text-dark-900 shadow-lg shadow-gold-500/20 hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {saving ? "Saving Changes..." : "Save Profile Settings"}
        </button>
      </form>
    </div>
  );
};

export default UserProfile;
