import React, { useState, useEffect } from 'react';
import { Trophy, Users, Search, Swords, Play, Shield, Loader2, User } from 'lucide-react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

let clientArenaCache = null;

const Arena = () => {
  const { chessProfile } = useAuth();
  const [players, setPlayers] = useState(clientArenaCache?.players || []);
  const [matches, setMatches] = useState(clientArenaCache?.matches || []);
  const [loading, setLoading] = useState(!clientArenaCache);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!clientArenaCache) setLoading(true);
      try {
        const [playersRes, matchesRes] = await Promise.all([
          apiClient.get('/arena/players').catch(() => ({ data: { players: [] } })),
          apiClient.get('/arena/matches').catch(() => ({ data: { matches: [] } }))
        ]);
        if (isMounted) {
          const p = playersRes.data.players || [];
          const m = matchesRes.data.matches || [];
          setPlayers(p);
          setMatches(m);
          clientArenaCache = { players: p, matches: m };
        }
      } catch (err) {
        console.error('Failed to load arena data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
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
        <div className="flex items-center space-x-2.5">
          <h2 className="text-2xl font-bold font-display flex items-center gap-3" style={{ color: '#F3EFE6' }}>
            <Trophy size={24} style={{ color: '#D4B46A' }} />
            Chess Evolve AI Arena
          </h2>
          {chessProfile?.chessUsername && (
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
              Playing as @{chessProfile.chessUsername}
            </span>
          )}
        </div>
        <p className="text-sm mt-1" style={{ color: '#7E8092' }}>
          Challenge the Current and Peak AI models of top players around the world.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#7E8092' }} />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
            style={{ background: '#0B0C12', border: '1px solid #181A24', color: '#F3EFE6', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(197,160,89,0.55)'}
            onBlur={e => e.currentTarget.style.borderColor = '#181A24'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
          <div className="grid grid-cols-12 gap-4 px-6 py-4 text-xs font-bold uppercase tracking-wider"
            style={{ borderBottom: '1px solid #181A24', color: '#8A8D9F' }}>
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-6">Player & Models</div>
            <div className="col-span-2 text-center">AI Rating</div>
            <div className="col-span-3 text-right">Action</div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: '#181A24', borderTopColor: '#C5A059' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-sm" style={{ color: '#7E8092' }}>
              No eligible opponents yet.
            </div>
          ) : (
            <div className="divide-y divide-[#141622]">
              {filtered.map((player, i) => (
                <div key={player.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[rgba(197,160,89,0.03)] transition-colors">
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-bold font-display"
                      style={{ color: i === 0 ? '#D4B46A' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#7E8092' }}>
                      #{i + 1}
                    </span>
                  </div>
                  <div className="col-span-6 flex items-center space-x-3">
                    {player.user?.avatarUrl ? (
                      <img src={player.user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-[#181A24]" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0D0E14] border flex items-center justify-center"
                        style={{ borderColor: '#181A24' }}>
                        <User size={14} style={{ color: '#D4B46A' }} />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold" style={{ color: '#F3EFE6' }}>{player.displayName || player.user?.chessProfile?.chessUsername || player.user?.displayName || 'Unknown Player'}</div>
                      <div className="text-[10px] mt-1 space-x-2">
                        {player.models?.map(m => (
                          <span key={m.id} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            m.modelType === 'PEAK_SELF'
                              ? 'bg-[rgba(197,160,89,0.14)] text-[#D4B46A] border-[rgba(197,160,89,0.3)]'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                          }`}>
                            {m.modelType.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-sm font-bold" style={{ color: '#D4B46A' }}>
                    {player.ratings?.[0]?.rating || 1500}
                  </div>
                  <div className="col-span-3 flex flex-col gap-2 items-end">
                    {player.models?.map(m => (
                      <button key={m.id} onClick={() => handleChallenge(player.userId, m.modelType)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center space-x-1 ml-auto shadow-sm"
                        style={{ background: 'rgba(197,160,89,0.1)', color: '#D4B46A', border: '1px solid rgba(197,160,89,0.25)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(197,160,89,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(197,160,89,0.1)'}>
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
          <h2 className="text-xl font-bold font-display flex items-center space-x-2" style={{ color: '#F3EFE6' }}>
            <Play className="w-5 h-5" style={{ color: '#D4B46A' }} />
            <span>My Matches</span>
          </h2>
          
          <div className="rounded-2xl p-4 min-h-[300px]" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            {matches.length === 0 ? (
              <div className="text-center text-sm mt-12" style={{ color: '#7E8092' }}>No recent matches.</div>
            ) : (
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors" 
                    style={{ background: '#0E1017', border: '1px solid #181A24' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#141622'; e.currentTarget.style.borderColor = 'rgba(197,160,89,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0E1017'; e.currentTarget.style.borderColor = '#181A24'; }}
                    onClick={() => navigate(`/arena/${m.id}`)}>
                    <div>
                      <div className="text-sm font-bold" style={{ color: '#F3EFE6' }}>{m.timeControl} Match</div>
                      <div className="text-[10px] mt-1" style={{ color: '#7E8092' }}>
                        {new Date(m.createdAt).toLocaleDateString()} • {m.status.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-xs font-semibold px-2 py-1 rounded" style={{ background: '#040406', color: '#D4B46A', border: '1px solid rgba(197,160,89,0.2)' }}>
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
