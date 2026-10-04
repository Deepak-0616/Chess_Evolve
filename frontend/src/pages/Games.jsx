import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, TrendingUp } from 'lucide-react';
import { getGames } from '../api';

const DEMO_GAMES = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  white: i % 2 === 0 ? 'You' : `Opponent_${i}`,
  black: i % 2 === 0 ? `Opponent_${i}` : 'You',
  result: ['1-0', '0-1', '1/2-1/2'][i % 3],
  opening: ['Sicilian Defense', 'Ruy Lopez', 'French Defense', "Queen's Gambit", 'Italian Game'][i % 5],
  timeControl: ['5+0', '10+0', '15+10', '3+2'][i % 4],
  accuracy: Math.floor(Math.random() * 20 + 78),
  date: new Date(Date.now() - i * 3600000 * 24).toLocaleDateString(),
  moves: Math.floor(Math.random() * 40 + 20),
  myRating: 1453 + Math.floor(Math.random() * 20 - 10),
}));

const ResultBadge = ({ result, isWhite }) => {
  let text, style;
  if (result === '1-0') {
    if (isWhite) { text = 'Win'; style = { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' }; }
    else { text = 'Loss'; style = { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.25)' }; }
  } else if (result === '0-1') {
    if (!isWhite) { text = 'Win'; style = { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' }; }
    else { text = 'Loss'; style = { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.25)' }; }
  } else {
    text = 'Draw'; style = { bg: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: 'rgba(212,175,55,0.25)' };
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
      {text}
    </span>
  );
};

const Games = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getGames({ page, limit: perPage });
        setGames(res.data?.data?.games || []);
      } catch {
        setGames(DEMO_GAMES);
      }
      setLoading(false);
    };
    load();
  }, [page]);

  const filtered = games.filter(g => {
    const matchSearch = search === '' ||
      g.opening?.toLowerCase().includes(search.toLowerCase()) ||
      g.white?.toLowerCase().includes(search.toLowerCase()) ||
      g.black?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (resultFilter === 'all') return true;
    const isWhite = g.white === 'You';
    if (resultFilter === 'win') return (g.result === '1-0' && isWhite) || (g.result === '0-1' && !isWhite);
    if (resultFilter === 'loss') return (g.result === '0-1' && isWhite) || (g.result === '1-0' && !isWhite);
    if (resultFilter === 'draw') return g.result === '1/2-1/2';
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>Game History</h2>
        <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>
          Browse and analyze your chess games
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4A4A4A' }} />
          <input
            type="text"
            placeholder="Search opening, opponent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: '#0F0F0F', border: '1px solid #1A1A1A', color: '#F5F0E0', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'}
            onBlur={e => e.currentTarget.style.borderColor = '#1A1A1A'}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'win', 'loss', 'draw'].map(f => (
            <button key={f} onClick={() => setResultFilter(f)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all"
              style={{
                background: resultFilter === f ? 'rgba(212,175,55,0.12)' : '#0F0F0F',
                color: resultFilter === f ? '#D4AF37' : '#6B6B6B',
                border: `1px solid ${resultFilter === f ? 'rgba(212,175,55,0.3)' : '#1A1A1A'}`,
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{ borderBottom: '1px solid #1A1A1A', color: '#4A4A4A' }}>
          <div className="col-span-1">Result</div>
          <div className="col-span-3">Opponent</div>
          <div className="col-span-3">Opening</div>
          <div className="col-span-1">Time</div>
          <div className="col-span-1 text-center">Moves</div>
          <div className="col-span-1 text-center">Accuracy</div>
          <div className="col-span-1 text-center">Rating</div>
          <div className="col-span-1 text-right">Date</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: '#1A1A1A', borderTopColor: '#D4AF37' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#4A4A4A' }}>
            No games found matching your filters
          </div>
        ) : (
          <div className="divide-y" style={{ divideColor: '#111' }}>
            {filtered.map((game, i) => {
              const isWhite = game.white === 'You';
              return (
                <div key={game.id || i}
                  className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors group">
                  <div className="col-span-1">
                    <ResultBadge result={game.result} isWhite={isWhite} />
                  </div>
                  <div className="col-span-3 text-sm" style={{ color: '#F5F0E0' }}>
                    <div className="truncate">{isWhite ? game.black : game.white}</div>
                    <div className="text-xs" style={{ color: '#4A4A4A' }}>vs {isWhite ? '♔' : '♚'}</div>
                  </div>
                  <div className="col-span-3 text-xs truncate" style={{ color: '#6B6B6B' }}>{game.opening}</div>
                  <div className="col-span-1 text-xs" style={{ color: '#4A4A4A' }}>{game.timeControl}</div>
                  <div className="col-span-1 text-xs text-center" style={{ color: '#6B6B6B' }}>{game.moves}</div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold"
                      style={{ color: game.accuracy >= 90 ? '#4ade80' : game.accuracy >= 75 ? '#D4AF37' : '#f87171' }}>
                      {game.accuracy}%
                    </span>
                  </div>
                  <div className="col-span-1 text-xs text-center" style={{ color: '#6B6B6B' }}>{game.myRating}</div>
                  <div className="col-span-1 text-xs text-right" style={{ color: '#4A4A4A' }}>{game.date}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid #111' }}>
          <span className="text-xs" style={{ color: '#4A4A4A' }}>{filtered.length} games</span>
          <div className="flex items-center space-x-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: page === 1 ? '#2A2A2A' : '#6B6B6B', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs" style={{ color: '#4A4A4A' }}>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded-lg transition-all" style={{ color: '#6B6B6B' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Games;
