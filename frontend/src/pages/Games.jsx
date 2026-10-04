import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Swords, Filter, Search, ArrowRight, Loader2 } from 'lucide-react';

export const Games = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterResult, setFilterResult] = useState('');
  const [filterTimeClass, setFilterTimeClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchGames() {
      setLoading(true);
      try {
        let url = '/games?limit=50';
        if (filterResult) url += `&result=${filterResult}`;
        if (filterTimeClass) url += `&timeClass=${filterTimeClass}`;
        const res = await apiClient.get(url);
        setGames(res.data.games || []);
      } catch (err) {
        console.error('Failed to fetch games:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, [filterResult, filterTimeClass]);

  const filteredGames = games.filter(g =>
    g.opponentUsername.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Swords className="w-7 h-7 text-emerald-400" />
            <span>Synchronized Game History</span>
          </h1>
          <p className="text-xs text-slate-400">
            All retrievable games imported from your connected Chess.com account
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search opponent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-surface border border-white/10 text-white text-sm focus:outline-none"
          >
            <option value="">All Results</option>
            <option value="WIN">Wins</option>
            <option value="LOSS">Losses</option>
            <option value="DRAW">Draws</option>
          </select>

          <select
            value={filterTimeClass}
            onChange={(e) => setFilterTimeClass(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-surface border border-white/10 text-white text-sm focus:outline-none"
          >
            <option value="">All Time Controls</option>
            <option value="blitz">Blitz</option>
            <option value="rapid">Rapid</option>
            <option value="bullet">Bullet</option>
          </select>
        </div>
      </div>

      {/* Games List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <div className="p-6 rounded-2xl glass-panel space-y-4">
          <div className="divide-y divide-white/5">
            {filteredGames.map((g) => (
              <div key={g.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded text-xs font-black uppercase ${
                    g.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    g.result === 'LOSS' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-500/20 text-slate-300'
                  }`}>
                    {g.result}
                  </span>
                  <div>
                    <div className="text-base font-bold text-white">
                      vs {g.opponentUsername} <span className="text-xs text-slate-400 font-normal">({g.opponentRating})</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {g.timeClass.toUpperCase()} • Color: {g.userColor} • Rating: {g.userRating}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                  {g.gameAnalysis && (
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">{g.gameAnalysis.accuracy}% Acc</div>
                      <div className="text-[11px] text-slate-500">{g.gameAnalysis.blunders} Blunders</div>
                    </div>
                  )}
                  <Link
                    to={`/games/${g.id}`}
                    className="px-4 py-2 rounded-xl bg-surface border border-white/10 hover:border-emerald-500/40 text-xs font-bold text-slate-200 transition-colors flex items-center space-x-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {filteredGames.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm">
                No games found matching selected criteria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
