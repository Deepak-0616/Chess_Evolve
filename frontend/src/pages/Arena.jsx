import React, { useState, useEffect } from 'react';
import { Trophy, Users, Search, Swords } from 'lucide-react';
import { getArenaLeaderboard } from '../api';

const Arena = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getArenaLeaderboard();
        setLeaderboard(res.data?.data || []);
      } catch (err) {
        console.error('Failed to load arena leaderboard', err);
        setLeaderboard([]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = leaderboard.filter(p =>
    p.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display flex items-center gap-3" style={{ color: '#F5F0E0' }}>
          <Trophy size={24} style={{ color: '#D4AF37' }} />
          Global Arena
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>
          Challenge the Peak AI models of top players around the world.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6B6B6B' }} />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
            style={{ background: '#0F0F0F', border: '1px solid #1A1A1A', color: '#F5F0E0', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'}
            onBlur={e => e.currentTarget.style.borderColor = '#1A1A1A'}
          />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
        <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider"
          style={{ borderBottom: '1px solid #1A1A1A', color: '#4A4A4A' }}>
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-2 text-center">AI Elo</div>
          <div className="col-span-2 text-center">Games Played</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: '#1A1A1A', borderTopColor: '#D4AF37' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm" style={{ color: '#6B6B6B' }}>
            No players found in the arena. Check back later!
          </div>
        ) : (
          <div className="divide-y" style={{ divideColor: '#111' }}>
            {filtered.map((player, i) => (
              <div key={player.id || i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors">
                <div className="col-span-1 text-center">
                  <span className="text-sm font-bold font-display"
                    style={{ color: i === 0 ? '#D4AF37' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#6B6B6B' }}>
                    #{i + 1}
                  </span>
                </div>
                <div className="col-span-5 flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-black border flex items-center justify-center"
                    style={{ borderColor: '#2A2A2A' }}>
                    <Users size={14} style={{ color: '#D4AF37' }} />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#F5F0E0' }}>{player.username}</div>
                    <div className="text-[10px]" style={{ color: '#4A4A4A' }}>{player.title || 'Player'}</div>
                  </div>
                </div>
                <div className="col-span-2 text-center text-sm font-bold" style={{ color: '#D4AF37' }}>
                  {player.aiRating}
                </div>
                <div className="col-span-2 text-center text-sm" style={{ color: '#6B6B6B' }}>
                  {player.gamesPlayed || 0}
                </div>
                <div className="col-span-2 text-right">
                  <button className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ml-auto"
                    style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,175,55,0.1)'}>
                    <Swords size={12} />
                    <span>Challenge AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Arena;
