import React, { useEffect, useState } from "react";
import { TrendingUp, Dna, Bot, RotateCw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { ApiClient } from "../services/api.js";

export const Evolution = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvolution = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ApiClient.getEvolution();
      setData(res);
    } catch (err) {
      console.warn("Failed to fetch evolution timeline:", err);
      setError(err.message || "Failed to load evolution timeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvolution();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center space-x-3 text-gold-400">
          <RotateCw className="h-6 w-6 animate-spin" />
          <span className="text-sm font-semibold">Constructing Evolution Timeline...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 max-w-md space-y-2">
          <p className="text-base font-bold">Unable to construct Evolution Timeline</p>
          <p className="text-xs text-gray-300">{error || "Failed to communicate with server."}</p>
        </div>
        <button
          onClick={loadEvolution}
          className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-xs font-bold text-dark-900 shadow-lg shadow-gold-500/20 hover:scale-105 transition-transform"
        >
          <RotateCw className="h-4 w-4" />
          <span>Retry Loading Timeline</span>
        </button>
      </div>
    );
  }

  const { rating, dnaVersions, peakSelfVersions } = data;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center space-x-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-400">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Longitudinal Performance Timeline</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Your AI & Skill Evolution Journey</h1>
        <p className="text-xs text-gray-300 max-w-xl">
          Track how your rating, accuracy, Chess DNA versions, and Peak Self bots evolved as you played more games.
        </p>
      </div>

      {/* Rating & Accuracy Timeline Chart */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-white">Rating Trajectory Over Time</h3>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rating}>
              <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
              <YAxis stroke="#6B7280" fontSize={11} domain={["dataMin - 50", "dataMax + 50"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#121214", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px" }}
              />
              <Line type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={3} dot={{ fill: "#F59E0B", r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DNA & Peak Self Version Progression */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DNA Versions */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Dna className="h-5 w-5 text-emerald-400" />
            <span>Chess DNA Versions</span>
          </h3>

          <div className="space-y-3">
            {dnaVersions.map((dna) => (
              <div key={dna.version} className="rounded-2xl border border-white/10 bg-dark-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">DNA Version {dna.version}</span>
                  <span className="text-xs text-gray-400">{new Date(dna.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="rounded-lg bg-dark-800 p-2 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Aggression</span>
                    <span className="font-bold text-gold-400">{dna.metrics.aggression}%</span>
                  </div>
                  <div className="rounded-lg bg-dark-800 p-2 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Tactics</span>
                    <span className="font-bold text-gold-400">{dna.metrics.tacticalPreference}%</span>
                  </div>
                  <div className="rounded-lg bg-dark-800 p-2 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Endgame</span>
                    <span className="font-bold text-gold-400">{dna.metrics.endgameAbility}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Self Versions */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Bot className="h-5 w-5 text-violet-400" />
            <span>Peak Self AI Versions</span>
          </h3>

          <div className="space-y-3">
            {peakSelfVersions.map((peak) => (
              <div key={peak.version} className="rounded-2xl border border-white/10 bg-dark-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Peak Self v{peak.version}</span>
                  <span className="text-xs text-gray-400">{new Date(peak.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="rounded-lg bg-dark-800 p-2 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Tactical</span>
                    <span className="font-bold text-violet-400">{peak.strengthProfile.tactical}%</span>
                  </div>
                  <div className="rounded-lg bg-dark-800 p-2 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Defense</span>
                    <span className="font-bold text-violet-400">{peak.strengthProfile.defense}%</span>
                  </div>
                  <div className="rounded-lg bg-dark-800 p-2 border border-white/5">
                    <span className="text-[10px] text-gray-400 block">Positional</span>
                    <span className="font-bold text-violet-400">{peak.strengthProfile.positional}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
