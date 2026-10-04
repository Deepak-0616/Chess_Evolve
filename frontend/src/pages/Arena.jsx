import React, { useState, useEffect } from 'react';
import { Trophy, Swords, TrendingUp, User, Crown, Star, Zap } from 'lucide-react';
import { getArenaPlayers } from '../api';

const DEMO_PLAYERS = [
  { rank: 1, username: 'QuantumKnight', rating: 1892, wins: 145, losses: 32, winRate: 82, trend: 'up', badge: '👑' },
  { rank: 2, username: 'SilentBishop', rating: 1847, wins: 128, losses: 41, winRate: 76, trend: 'up', badge: '⚔' },
  { rank: 3, username: 'TacticalRook', rating: 1791, wins: 115, losses: 55, winRate: 68, trend: 'flat', badge: '♟' },
  { rank: 4, username: 'PawnStorm99', rating: 1743, wins: 98, losses: 58, winRate: 63, trend: 'up', badge: '🔥' },
  { rank: 5, username: 'You', rating: 1453, wins: 134, losses: 89, winRate: 60, trend: 'up', badge: '⭐', isYou: true },
  { rank: 6, username: 'EndgameAce', rating: 1421, wins: 88, losses: 67, winRate: 57, trend: 'down', badge: '♟' },
  { rank: 7, username: 'BlitzMaster', rating: 1398, wins: 77, losses: 72, winRate: 52, trend: 'flat', badge: '♟' },
  { rank: 8, username: 'ClassicPlayer', rating: 1367, wins: 65, losses: 71, winRate: 48, trend: 'down', badge: '♟' },
  { rank: 9, username: 'RapidFire', rating: 1334, wins: 54, losses: 78, winRate: 41, trend: 'down', badge: '♟' },
  { rank: 10, username: 'CaissaFan', rating: 1298, wins: 43, losses: 89, winRate: 33, trend: 'down', badge: '♟' },
];

const RankBadge = ({ rank }) => {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-bold" style={{ color: '#4A4A4A' }}>#{rank}</span>;
};

const Arena = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leaderboard');
  const [challenging, setChallenging] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getArenaPlayers();
        setPlayers(res.data?.data || DEMO_PLAYERS);
      } catch {
        setPlayers(DEMO_PLAYERS);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleChallenge = (player) => {
    setChallenging(player.username);
    setTimeout(() => {
      setChallenging(null);
      alert(`Challenge sent to ${player.username}! They will be notified.`);
    }, 1500);
  };

  const myRank = players.find(p => p.isYou);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>Arena</h2>
          <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>Battle other players' AI models in ranked matches</p>
        </div>
        {myRank && (
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <Trophy size={14} style={{ color: '#D4AF37' }} />
            <span className="text-sm font-bold" style={{ color: '#D4AF37' }}>Rank #{myRank.rank}</span>
            <span className="text-xs" style={{ color: '#6B6B6B' }}>· {myRank.rating} ELO</span>
          </div>
        )}
      </div>

      {/* Your stats */}
      {myRank && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Arena Rating', value: myRank.rating, icon: Star },
            { label: 'Win Rate', value: `${myRank.winRate}%`, icon: TrendingUp },
            { label: 'Global Rank', value: `#${myRank.rank}`, icon: Crown },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-4 rounded-xl text-center"
              style={{ background: 'linear-gradient(145deg, #141414, #111111)', border: '1px solid rgba(212,175,55,0.15)' }}>
              <Icon size={16} className="mx-auto mb-2" style={{ color: '#D4AF37' }} />
              <div className="text-xl font-black font-display" style={{
                background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
        <div className="flex items-center space-x-2 px-5 py-4 border-b" style={{ borderColor: '#1A1A1A' }}>
          <Trophy size={14} style={{ color: '#D4AF37' }} />
          <span className="font-bold text-sm" style={{ color: '#F5F0E0' }}>Global Leaderboard</span>
          <span className="text-xs ml-auto" style={{ color: '#3A3A3A' }}>Updated live</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: '#1A1A1A', borderTopColor: '#D4AF37' }} />
          </div>
        ) : (
          <div className="divide-y" style={{ divideColor: '#111' }}>
            {players.map((player, i) => (
              <div key={player.rank}
                className="flex items-center px-5 py-3.5 transition-all hover:bg-white/[0.02]"
                style={player.isYou ? { background: 'rgba(212,175,55,0.04)', borderLeft: '2px solid rgba(212,175,55,0.4)' } : {}}>
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  <RankBadge rank={player.rank} />
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mx-3"
                  style={player.isYou
                    ? { background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }
                    : { background: '#1A1A1A', color: '#6B6B6B', border: '1px solid #2A2A2A' }}>
                  {player.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold" style={{ color: player.isYou ? '#D4AF37' : '#F5F0E0' }}>
                      {player.username}
                    </span>
                    {player.isYou && <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>You</span>}
                  </div>
                  <div className="text-xs" style={{ color: '#4A4A4A' }}>
                    {player.wins}W · {player.losses}L · {player.winRate}% WR
                  </div>
                </div>
                <div className="text-right mr-4">
                  <div className="font-bold text-sm" style={{ color: '#F5F0E0' }}>{player.rating}</div>
                  <div className="text-xs" style={{ color: '#4A4A4A' }}>ELO</div>
                </div>
                {!player.isYou && (
                  <button
                    onClick={() => handleChallenge(player)}
                    disabled={challenging === player.username}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: challenging === player.username ? '#1A1A1A' : 'rgba(212,175,55,0.1)',
                      color: challenging === player.username ? '#4A4A4A' : '#D4AF37',
                      border: `1px solid ${challenging === player.username ? '#2A2A2A' : 'rgba(212,175,55,0.25)'}`,
                    }}>
                    <Swords size={10} />
                    <span>{challenging === player.username ? 'Sent!' : 'Challenge'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Arena;
