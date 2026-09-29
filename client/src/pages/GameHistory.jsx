import React, { useEffect, useState } from "react";
import { History, Search, RotateCw } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const GameHistory = ({ onAnalyzeGame }) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [resultFilter, setResultFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [openingFilter, setOpeningFilter] = useState("");

  const loadGames = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (resultFilter) params.result = resultFilter;
      if (colorFilter) params.color = colorFilter;
      if (openingFilter) params.opening = openingFilter;

      const res = await ApiClient.getGames(params);
      setGames(res.data || res);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
      }
    } catch (err) {
      console.warn("Failed to load games:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, [page, resultFilter, colorFilter, openingFilter]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center space-x-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-400">
          <History className="h-3.5 w-3.5" />
          <span>Imported Database History</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Searchable Game Archives</h1>
        <p className="text-xs text-gray-300">
          All games imported from your public Chess.com profile history with Stockfish analysis ratings.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by Opening..."
              value={openingFilter}
              onChange={(e) => setOpeningFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-dark-900 pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-gold-500 focus:outline-none"
            />
          </div>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-dark-900 px-3 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
          >
            <option value="">All Results</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="draw">Draw</option>
          </select>

          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-dark-900 px-3 py-2 text-xs text-white focus:border-gold-500 focus:outline-none"
          >
            <option value="">All Colors</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>

        <button
          onClick={() => {
            setResultFilter("");
            setColorFilter("");
            setOpeningFilter("");
          }}
          className="text-xs text-gray-400 hover:text-white"
        >
          Reset Filters
        </button>
      </div>

      {/* Games Table */}
      <div className="glass-panel rounded-3xl p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center space-x-3 text-gold-400">
              <RotateCw className="h-6 w-6 animate-spin" />
              <span className="text-sm font-semibold">Loading games...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Color</th>
                  <th className="py-3 px-4">Players</th>
                  <th className="py-3 px-4">Opening</th>
                  <th className="py-3 px-4">Accuracy</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {games.map((game) => (
                  <tr key={game.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 text-gray-400">
                      {game.playedAt ? new Date(game.playedAt).toLocaleDateString() : "--"}
                    </td>
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
                    <td className="py-3.5 px-4 font-semibold text-gray-300">{game.playerColor}</td>
                    <td className="py-3.5 px-4 text-white">
                      <span className="font-semibold">{game.white}</span> vs <span className="font-semibold">{game.black}</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 max-w-[200px] truncate">{game.openingName || "Standard"}</td>
                    <td className="py-3.5 px-4 font-bold text-gold-400">{game.accuracy ? `${game.accuracy}%` : "--"}</td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onAnalyzeGame(game.id)}
                        className="rounded-lg bg-gold-500/10 border border-gold-500/30 px-3 py-1 text-[11px] font-semibold text-gold-400 hover:bg-gold-500/20"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5 text-xs text-gray-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/10 bg-dark-900 px-3 py-1 text-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/10 bg-dark-900 px-3 py-1 text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
