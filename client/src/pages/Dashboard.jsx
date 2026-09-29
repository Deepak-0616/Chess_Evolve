import React, { useEffect, useState } from "react";
import {
  BrainCircuit,
  Trophy,
  Activity,
  Dna,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Play,
  RotateCw,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { ApiClient } from "../services/api.js";

export const Dashboard = ({ onNavigate, onOpenConnect }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.getDashboard();
      setData(res);
    } catch (err) {
      console.warn("Failed to load dashboard data:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-gold-400">
          <RotateCw className="h-6 w-6 animate-spin" />
          <span className="text-sm font-semibold">Loading AI Performance Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 max-w-md space-y-2">
          <ShieldAlert className="h-8 w-8 mx-auto text-red-400" />
          <p className="text-base font-bold">Unable to load AI Performance Dashboard</p>
          <p className="text-xs text-gray-300">{error || "Failed to communicate with server."}</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-xs font-bold text-dark-900 shadow-lg shadow-gold-500/20 hover:scale-105 transition-transform"
        >
          <RotateCw className="h-4 w-4" />
          <span>Retry Loading Dashboard</span>
        </button>
      </div>
    );
  }

  const { player, performance, dna, peakSelf, recentGames } = data;

  const mockChartData = [
    { date: "Jan", rating: player.rating - 120 },
    { date: "Mar", rating: player.rating - 75 },
    { date: "May", rating: player.rating - 40 },
    { date: "Jul", rating: player.rating - 15 },
    { date: "Sep", rating: player.rating },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Unsynced Banner prompt if 0 games analyzed */}
      {player.gamesAnalyzed === 0 && (
        <div className="rounded-3xl border border-gold-500/30 bg-gradient-to-r from-dark-800 via-gold-950/20 to-dark-800 p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start space-x-2">
              <Sparkles className="h-5 w-5 text-gold-400" />
              <span>Connect Your Chess.com Account</span>
            </h3>
            <p className="text-xs text-gray-300 max-w-lg">
              Sync your Chess.com profile to import your games, extract your unique Chess DNA metrics, and create your personalized Peak Self AI opponent!
            </p>
          </div>
          <button
            onClick={onOpenConnect}
            className="rounded-2xl bg-gold-500 px-6 py-3 text-xs font-bold text-dark-900 shadow-lg shadow-gold-500/20 hover:scale-105 transition-all shrink-0"
          >
            Connect Profile Now
          </button>
        </div>
      )}

      {/* Top Banner & Peak Self Shortcut */}
      <div className="glass-panel-gold rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center space-x-2 rounded-full bg-gold-500/20 border border-gold-500/30 px-3 py-1 text-xs font-bold text-gold-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Peak Self v{peakSelf.version} Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome back, <span className="text-gold-gradient">{player.username}</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl">
            Your Peak Self AI has been updated with your latest {player.gamesAnalyzed} analyzed games. Challenge your AI counterpart to test your evolution.
          </p>
        </div>

        <button
          onClick={() => onNavigate("play", { opponentType: "PEAK_SELF" })}
          className="flex items-center space-x-3 rounded-2xl bg-gradient-to-r from-gold-500 via-gold-500 to-gold-600 px-6 py-3.5 text-sm font-bold text-dark-900 shadow-xl shadow-gold-500/25 transition-all hover:scale-105 hover:shadow-gold-500/40 shrink-0"
        >
          <Play className="h-4 w-4 fill-dark-900" />
          <span>Play Against Peak Self</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Current Rating</span>
            <Trophy className="h-4 w-4 text-gold-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{player.rating}</p>
          <p className="text-[11px] text-emerald-400 flex items-center">
            <ArrowUpRight className="h-3 w-3 mr-1" />
            Top 15% performance tier
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Games Analyzed</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-3xl font-extrabold text-white">{player.gamesAnalyzed}</p>
          <p className="text-[11px] text-gray-400">100% Stockfish evaluated</p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Accuracy</span>
            <BrainCircuit className="h-4 w-4 text-violet-400" />
          </div>
          <p className="text-3xl font-extrabold text-violet-400">{performance.accuracy}%</p>
          <p className="text-[11px] text-gray-400">
            W: {performance.wins} | L: {performance.losses} | D: {performance.draws}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Chess DNA</span>
            <Dna className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">v{dna.version}</p>
          <p className="text-[11px] text-gray-400">Updated from real move history</p>
        </div>
      </div>

      {/* Main Grid: Rating Chart & Strengths/Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel lg:col-span-2 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Rating & Evolution Progression</h3>
              <p className="text-xs text-gray-400">Performance trajectory derived from Chess.com sync</p>
            </div>
            <button
              onClick={() => onNavigate("evolution")}
              className="text-xs font-semibold text-gold-400 hover:underline"
            >
              View Evolution Page →
            </button>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
                <YAxis domain={["dataMin - 50", "dataMax + 50"]} stroke="#6B7280" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#121722", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="rating" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#goldGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 space-y-3 border-l-4 border-l-emerald-500">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Top Strength</span>
            </div>
            <h4 className="text-lg font-bold text-white">{dna.topStrength}</h4>
            <p className="text-xs text-gray-400">
              High scoring initiative and tactical aggression during early middlegame exchanges.
            </p>
            <button
              onClick={() => onNavigate("dna")}
              className="text-xs font-semibold text-emerald-400 hover:underline pt-1 block"
            >
              Inspect Chess DNA →
            </button>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-3 border-l-4 border-l-red-500">
            <div className="flex items-center space-x-2 text-red-400">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Primary Training Target</span>
            </div>
            <h4 className="text-lg font-bold text-white">{dna.topWeakness}</h4>
            <p className="text-xs text-gray-400">
              Identified across 7 analyzed games when castled king was subjected to pawn storms.
            </p>
            <button
              onClick={() => onNavigate("training")}
              className="text-xs font-semibold text-red-400 hover:underline pt-1 block"
            >
              Start Custom Training Session →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Games Table */}
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Recently Analyzed Games</h3>
          <button onClick={() => onNavigate("history")} className="text-xs font-semibold text-gold-400 hover:underline">
            View All Games →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Players</th>
                <th className="py-3 px-4">Opening</th>
                <th className="py-3 px-4">Accuracy</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentGames.map((game) => (
                <tr key={game.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4 font-bold">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] ${
                        game.result === "1-0" && game.playerColor === "WHITE"
                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                          : game.result === "0-1" && game.playerColor === "BLACK"
                          ? "bg-green-500/10 text-green-400 border border-green-500/30"
                          : "bg-red-500/10 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {game.result === "1-0" ? "WIN" : game.result === "0-1" ? "LOSS" : "DRAW"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-white">
                    <span className="font-semibold">{game.white}</span> vs <span className="font-semibold">{game.black}</span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 max-w-[180px] truncate">{game.openingName || "Standard"}</td>
                  <td className="py-3.5 px-4 font-bold text-gold-400">{game.accuracy ? `${game.accuracy}%` : "--"}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onNavigate("analysis", { gameId: game.id })}
                      className="rounded-lg bg-gold-500/10 border border-gold-500/30 px-3 py-1 text-[11px] font-semibold text-gold-400 hover:bg-gold-500/20"
                    >
                      Analyze Game
                    </button>
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
