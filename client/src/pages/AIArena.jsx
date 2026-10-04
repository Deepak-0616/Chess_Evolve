import React, { useState, useEffect } from "react";
import { Swords, Search, UserCheck, Play, Shield, RefreshCw, Trophy, Globe, Zap, Activity } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const AIArena = ({ onNavigate }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  const fetchArenaPlayers = async (query = "") => {
    try {
      setLoading(true);
      const data = await ApiClient.getArenaPlayers({ query });
      setPlayers(data || []);
    } catch (err) {
      setError(err.message || "Failed to load AI Arena players.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArenaPlayers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchArenaPlayers(searchQuery);
  };

  const handleChallengePlayer = async (targetUserId, opponentType) => {
    try {
      const res = await ApiClient.startArenaSession(targetUserId, opponentType, "WHITE");
      if (res && res.sessionId) {
        onNavigate("play", { sessionId: res.sessionId, opponentType, arenaTarget: targetUserId });
      }
    } catch (err) {
      setError(err.message || "Failed to start AI Arena session.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Swords className="h-8 w-8 text-purple-400" />
            <span>AI Arena</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Play against the trained Current Self and Peak Self AI models of other Chess Evolve players worldwide.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative w-64 md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Chess.com username..."
              className="w-full rounded-xl border border-white/10 bg-dark-800 pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-md shadow-purple-600/20"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-purple-400 text-sm font-semibold">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          Loading AI Arena profiles...
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-dark-800/50 p-12 text-center space-y-4">
          <Globe className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="text-lg font-bold text-white">No Public AI Profiles Found</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            No public or discoverable AI profiles matched your query. Connect your Chess.com account and enable Public visibility in Settings to make your AI available in the Arena!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-white/10 bg-dark-800/80 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6 transition-all hover:border-purple-500/40 hover:shadow-purple-500/10"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.username} className="h-12 w-12 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold text-lg">
                        {p.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-white text-base">♟ {p.username}</span>
                        {p.title && (
                          <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-gold-400 border border-gold-500/40">
                            {p.title}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{p.displayName}</p>
                    </div>
                  </div>

                  {p.isSelf && (
                    <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 text-[10px] font-bold">
                      You
                    </span>
                  )}
                </div>

                {/* AI Rating breakdown */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-dark-900/60 p-3 border border-white/5 space-y-1">
                    <div className="flex items-center space-x-1 text-[11px] text-gray-400">
                      <Activity className="h-3 w-3 text-blue-400" />
                      <span>Current Self AI</span>
                    </div>
                    <p className="text-base font-bold text-white">{p.aiRatingCurrentSelf} Elo</p>
                  </div>

                  <div className="rounded-xl bg-dark-900/60 p-3 border border-white/5 space-y-1">
                    <div className="flex items-center space-x-1 text-[11px] text-gray-400">
                      <Zap className="h-3 w-3 text-gold-400" />
                      <span>Peak Self AI</span>
                    </div>
                    <p className="text-base font-bold text-gold-400">{p.aiRatingPeakSelf} Elo</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleChallengePlayer(p.userId, "CURRENT_SELF")}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 py-2.5 text-xs font-semibold text-blue-300 transition-all"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Play Current Self ({p.aiRatingCurrentSelf})</span>
                </button>

                <button
                  onClick={() => handleChallengePlayer(p.userId, "PEAK_SELF")}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:brightness-110 py-2.5 text-xs font-bold text-dark-900 transition-all shadow-md shadow-gold-500/20"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Play Peak Self ({p.aiRatingPeakSelf})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIArena;
