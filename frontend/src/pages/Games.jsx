import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getGames } from '../api';

const ResultBadge = ({ result, resultText, isWhite }) => {
  let text = 'Draw', style = { bg: 'rgba(197, 160, 89, 0.12)', color: '#C5A059', border: 'rgba(197, 160, 89, 0.25)' };
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
        <h2 className="text-xl font-bold font-display" style={{ color: '#F3EFE6' }}>Game History</h2>
        <p className="text-sm mt-0.5" style={{ color: '#7E8092' }}>
          {totalGames > 0 ? `Browse and analyze your ${totalGames.toLocaleString()} chess games` : 'Browse and analyze your chess games'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#7E8092' }} />
          <input
            type="text"
            placeholder="Search opening, opponent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{ background: '#0B0C12', border: '1px solid #181A24', color: '#F3EFE6', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(197, 160, 89, 0.5)'}
            onBlur={e => e.currentTarget.style.borderColor = '#181A24'}
          />
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1.5 p-1 rounded-xl bg-[#0B0C12] border border-[#181A24]">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'rated', label: 'Rated' },
              { id: 'casual', label: 'Casual' },
            ].map(r => (
              <button key={r.id} onClick={() => { setRatedFilter(r.id); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: ratedFilter === r.id ? 'rgba(197, 160, 89, 0.15)' : 'transparent',
                  color: ratedFilter === r.id ? '#C5A059' : '#7E8092',
                  border: ratedFilter === r.id ? '1px solid rgba(197, 160, 89, 0.35)' : '1px solid transparent',
                }}>
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 p-1 rounded-xl bg-[#0B0C12] border border-[#181A24]">
            {['all', 'win', 'loss', 'draw'].map(f => (
              <button key={f} onClick={() => { setResultFilter(f); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={{
                  background: resultFilter === f ? 'rgba(197, 160, 89, 0.15)' : 'transparent',
                  color: resultFilter === f ? '#C5A059' : '#7E8092',
                  border: resultFilter === f ? '1px solid rgba(197, 160, 89, 0.35)' : '1px solid transparent',
                }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{ borderBottom: '1px solid #181A24', color: '#7E8092' }}>
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
              style={{ borderColor: '#181A24', borderTopColor: '#C5A059' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#7E8092' }}>
            No games found.
          </div>
        ) : (
          <div className="divide-y divide-[#181A24]">
            {filtered.map((game, i) => {
              const isWhite = game.isWhite !== undefined ? game.isWhite : (game.white === 'You' || game.userColor === 'WHITE');
              return (
                <div key={game.id || i}
                  className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-[#141622]/40 transition-colors group">
                  <div className="col-span-1">
                    <ResultBadge result={game.result} resultText={game.resultText} isWhite={isWhite} />
                  </div>
                  <div className="col-span-3 text-sm" style={{ color: '#F3EFE6' }}>
                    <div className="truncate">{isWhite ? game.black : game.white}</div>
                    <div className="text-xs" style={{ color: '#7E8092' }}>vs {isWhite ? '♔' : '♚'}</div>
                  </div>
                  <div className="col-span-3 text-xs truncate" style={{ color: '#7E8092' }}>{game.opening}</div>
                  <div className="col-span-1 text-xs">
                    <div style={{ color: '#B5B8C8' }}>{game.timeControl}</div>
                    <div className="text-[10px] font-semibold" style={{ color: game.rated ? '#C5A059' : '#606275' }}>
                      {game.rated ? 'Rated' : 'Casual'}
                    </div>
                  </div>
                  <div className="col-span-1 text-xs text-center" style={{ color: '#7E8092' }}>{game.moves}</div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-bold"
                      style={{ color: game.accuracy >= 90 ? '#4ade80' : game.accuracy >= 75 ? '#C5A059' : '#f87171' }}>
                      {game.accuracy}%
                    </span>
                  </div>
                  <div className="col-span-1 text-xs text-center" style={{ color: '#7E8092' }}>{game.myRating}</div>
                  <div className="col-span-1 text-xs text-right" style={{ color: '#7E8092' }}>{new Date(game.date).toLocaleDateString()}</div>
                </div>
              );
            })}
          </div>
        )}

        {games.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3"
            style={{ borderTop: '1px solid #181A24' }}>
            <span className="text-xs" style={{ color: '#7E8092' }}>
              Showing {((page - 1) * perPage) + 1}–{Math.min(page * perPage, totalGames)} of {totalGames.toLocaleString()} games
            </span>
            <div className="flex items-center space-x-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: page === 1 ? '#222533' : '#7E8092', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs" style={{ color: '#7E8092' }}>
                Page <span style={{ color: '#F3EFE6', fontWeight: 'bold' }}>{page}</span> of {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: page >= totalPages ? '#222533' : '#7E8092', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
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
