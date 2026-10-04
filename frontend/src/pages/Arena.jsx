import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Globe, Swords, Trophy, ShieldCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Arena = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArena() {
      try {
        const res = await apiClient.get('/arena/players');
        setPlayers(res.data.players || []);
      } catch (err) {
        console.error('Failed to fetch arena players:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchArena();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center space-x-3">
          <Globe className="w-8 h-8 text-emerald-400" />
          <span>Community AI Arena</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Challenge public AI models of other players while private games and raw model binaries remain 100% protected
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {players.map((p) => (
          <div key={p.id} className="p-6 rounded-2xl glass-card space-y-4 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-lg flex items-center justify-center border border-emerald-500/30">
                {p.user?.displayName?.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {p.user?.displayName || 'Community Player'}
                </h3>
                <p className="text-xs text-slate-400">Rating: <span className="text-emerald-400 font-bold">{p.rating}</span></p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-white/5">
              <span>Visibility: <span className="text-white font-bold">{p.visibility}</span></span>
              <span>Total Arena Games: {p.totalGames}</span>
            </div>

            <button
              onClick={() => alert(`Challenging AI model of ${p.user?.displayName}...`)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-glow transition-all flex items-center justify-center space-x-2"
            >
              <Swords className="w-4 h-4" />
              <span>Challenge AI Model</span>
            </button>
          </div>
        ))}

        {players.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 text-sm">
            No public arena players currently listed. Enable "Public" visibility in your Profile settings to be featured!
          </div>
        )}
      </div>
    </div>
  );
};
