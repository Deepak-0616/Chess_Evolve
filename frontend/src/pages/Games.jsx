import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGames } from '../api';

const ResultBadge = ({ result, resultText, isWhite }) => {
  let text = 'Draw', style = { bg: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: 'rgba(212,175,55,0.25)' };
  const rText = (resultText || '').toUpperCase();
  if (rText === 'WIN' || (result === '1-0' && isWhite) || (result === '0-1' && !isWhite)) {
    text = 'Win'; style = { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.25)' };
  } else if (rText === 'LOSS' || (result === '0-1' && isWhite) || (result === '1-0' && !isWhite)) {
    text = 'Loss'; style = { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.25)' };
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
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [ratedFilter, setRatedFilter] = useState('all'); // 'all', 'rated', 'casual'
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: perPage };
        if (resultFilter !== 'all') {
          params.result = resultFilter;
        }
        if (ratedFilter === 'rated') {
          params.rated = true;
        } else if (ratedFilter === 'casual') {
          params.rated = false;
        }
        const res = await getGames(params);
        const fetchedGames = res.data?.games || res.data?.data?.games || [];
        setGames(fetchedGames);
        setTotalGames(res.data?.total ?? fetchedGames.length);
      } catch (err) {
        console.error('Failed to load games', err);
        setGames([]);
        setTotalGames(0);
      }
      setLoading(false);
    };
    load();
  }, [page, resultFilter, ratedFilter]);

  const filtered = games.filter(g => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      g.opening?.toLowerCase().includes(term) ||
      g.white?.toLowerCase().includes(term) ||
      g.black?.toLowerCase().includes(term) ||
      g.opponent?.toLowerCase().includes(term) ||
      g.opponentUsername?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalGames / perPage));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>Game History</h2>
        <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>
          {totalGames > 0 ? `Browse and analyze your ${totalGames.toLocaleString()} chess games` : 'Browse and analyze your chess games'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
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
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1.5 p-1 rounded-xl bg-[#0F0F0F] border border-[#1A1A1A]">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'rated', label: 'Rated' },
              { id: 'casual', label: 'Casual' },
            ].map(r => (
              <button key={r.id} onClick={() => { setRatedFilter(r.id); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: ratedFilter === r.id ? 'rgba(212,175,55,0.15)' : 'transparent',
                  color: ratedFilter === r.id ? '#D4AF37' : '#737373',
                  border: ratedFilter === r.id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                }}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 p-1 rounded-xl bg-[#0F0F0F] border border-[#1A1A1A]">
            {['all', 'win', 'loss', 'draw'].map(f => (
              <button key={f} onClick={() => { setResultFilter(f); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: resultFilter === f ? 'rgba(212,175,55,0.12)' : 'transparent',
                  color: resultFilter === f ? '#D4AF37' : '#6B6B6B',
                  border: resultFilter === f ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
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
            No games found.
          </div>
        ) : (
          <div className="divide-y" style={{ divideColor: '#111' }}>
            {filtered.map((game, i) => {
              const isWhite = game.isWhite !== undefined ? game.isWhite : (game.white === 'You' || game.userColor === 'WHITE');
              return (
                <div key={game.id || i}
                  className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-white/[0.02] transition-colors group">
                  <div className="col-span-1">
                    <ResultBadge result={game.result} resultText={game.resultText} isWhite={isWhite} />
                  </div>
                  <div className="col-span-3 text-sm" style={{ color: '#F5F0E0' }}>
                    <div className="truncate">{isWhite ? game.black : game.white}</div>
                    <div className="text-xs" style={{ color: '#4A4A4A' }}>vs {isWhite ? '♔' : '♚'}</div>
                  </div>
                  <div className="col-span-3 text-xs truncate" style={{ color: '#6B6B6B' }}>{game.opening}</div>
                  <div className="col-span-1 text-xs">
                    <div style={{ color: '#C0C0C0' }}>{game.timeControl}</div>
                    <div className="text-[10px] font-semibold" style={{ color: game.rated ? '#D4AF37' : '#666666' }}>
                      {game.rated ? 'Rated' : 'Casual'}
                    </div>
                  </div>
                  <div className="col-span-1 text-xs text-center" style={{ color: '#6B6B6B' }}>{game.moves}</div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold"
                      style={{ color: game.accuracy >= 90 ? '#4ade80' : game.accuracy >= 75 ? '#D4AF37' : '#f87171' }}>
                      {game.accuracy}%
                    </span>
                  </div>
                  <div className="col-span-1 text-xs text-center" style={{ color: '#6B6B6B' }}>{game.myRating}</div>
                  <div className="col-span-1 text-xs text-right" style={{ color: '#4A4A4A' }}>{new Date(game.date).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        )}

        {games.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid #111' }}>
            <span className="text-xs" style={{ color: '#4A4A4A' }}>
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalGames)} of {totalGames.toLocaleString()} games
            </span>
            <div className="flex items-center space-x-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: page === 1 ? '#2A2A2A' : '#6B6B6B', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs" style={{ color: '#888888' }}>
                Page <span style={{ color: '#F5F0E0', fontWeight: 'bold' }}>{page}</span> of {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: page >= totalPages ? '#2A2A2A' : '#6B6B6B', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Games;
