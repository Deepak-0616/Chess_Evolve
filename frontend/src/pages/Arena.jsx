import React, { useState, useEffect } from 'react';
import { Trophy, Users, Search, Swords, Play, Shield, Loader2, User } from 'lucide-react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

const Arena = () => {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [playersRes, matchesRes] = await Promise.all([
          apiClient.get('/arena/players').catch(() => ({ data: { players: [] } })),
          apiClient.get('/arena/matches').catch(() => ({ data: { matches: [] } }))
        ]);
        setPlayers(playersRes.data.players || []);
        setMatches(matchesRes.data.matches || []);
      } catch (err) {
        console.error('Failed to load arena data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleChallenge = async (opponentUserId, opponentModelType) => {
    try {
      const res = await apiClient.post('/arena/challenges', {
        opponentUserId,
        opponentModelType,
        myModelType: null // Human challenging AI by default in this view
      });
      // Accept challenge immediately for demo as we are challenging an AI
      const acceptRes = await apiClient.post(`/arena/challenges/${res.data.challenge.id}/accept`);
      navigate(`/arena/${acceptRes.data.match.id}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to challenge');
    }
  };

  const filtered = players.filter(p => {
    const name = p.displayName || p.user?.chessProfile?.chessUsername || p.user?.displayName || 'Unknown';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-display flex items-center gap-3" style={{ color: '#F5F0E0' }}>
          <Trophy size={24} style={{ color: '#D4AF37' }} />
          Chess Evolve AI Arena
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>
          Challenge the Current and Peak AI models of top players around the world.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
          <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider"
            style={{ borderBottom: '1px solid #1A1A1A', color: '#4A4A4A' }}>
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-6">Player & Models</div>
            <div className="col-span-2 text-center">AI Rating</div>
            <div className="col-span-3 text-right">Action</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: '#1A1A1A', borderTopColor: '#D4AF37' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-sm" style={{ color: '#6B6B6B' }}>
              No eligible opponents yet.
            </div>
          ) : (
            <div className="divide-y" style={{ divideColor: '#111' }}>
              {filtered.map((player, i) => (
                <div key={player.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors">
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-bold font-display"
                      style={{ color: i === 0 ? '#D4AF37' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#6B6B6B' }}>
                      #{i + 1}
                    </span>
                  </div>
                  <div className="col-span-6 flex items-center space-x-3">
                    {player.user?.avatarUrl ? (
                      <img src={player.user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-black border flex items-center justify-center"
                        style={{ borderColor: '#2A2A2A' }}>
                        <User size={14} style={{ color: '#D4AF37' }} />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold" style={{ color: '#F5F0E0' }}>{player.displayName || player.user?.chessProfile?.chessUsername || player.user?.displayName || 'Unknown Player'}</div>
                      <div className="text-[10px] mt-1 space-x-2">
                        {player.models?.map(m => (
                          <span key={m.id} className={`px-1.5 py-0.5 rounded ${m.modelType === 'PEAK_SELF' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {m.modelType.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-sm font-bold" style={{ color: '#D4AF37' }}>
                    {player.ratings?.[0]?.rating || 1500}
                  </div>
                  <div className="col-span-3 flex flex-col gap-2 items-end">
                    {player.models?.map(m => (
                      <button key={m.id} onClick={() => handleChallenge(player.userId, m.modelType)} className="px-3 py-1.5 rounded text-[10px] font-bold transition-all flex items-center justify-center space-x-1 ml-auto"
                        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(212,175,55,0.1)'}>
                        <Swords size={10} />
                        <span>Vs {m.modelType.split('_')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold font-display flex items-center space-x-2" style={{ color: '#F5F0E0' }}>
            <Play className="w-5 h-5 text-emerald-500" />
            <span>My Matches</span>
          </h2>
          
          <div className="rounded-2xl p-4 min-h-[300px]" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            {matches.length === 0 ? (
              <div className="text-center text-sm mt-12" style={{ color: '#6B6B6B' }}>No recent matches.</div>
            ) : (
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors" 
                    style={{ background: '#111', border: '1px solid #1A1A1A' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1A1A1A'}
                    onMouseLeave={e => e.currentTarget.style.background = '#111'}
                    onClick={() => navigate(`/arena/${m.id}`)}>
                    <div>
                      <div className="text-sm font-bold text-white">{m.timeControl} Match</div>
                      <div className="text-[10px] mt-1" style={{ color: '#6B6B6B' }}>
                        {new Date(m.createdAt).toLocaleDateString()} • {m.status.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-xs font-semibold px-2 py-1 rounded" style={{ background: '#080808', color: '#D4AF37' }}>
                      {m.result || '-'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Arena;
