import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Swords, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, TrendingUp, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const GameAnalysis = () => {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(0);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await apiClient.get(`/games/${gameId}`);
        setGame(res.data.game);
        if (res.data.game?.pgn) {
          chess.loadPgn(res.data.game.pgn);
          setFen(chess.fen());
        }
      } catch (err) {
        console.error('Error fetching game details:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGame();
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400">
        Game analysis record not found.
      </div>
    );
  }

  const positions = game.positionAnalyses || [];
  const currentAnalysis = positions[currentMoveIdx] || null;

  // Chart data for evaluation trajectory
  const chartData = positions.map((p, idx) => ({
    ply: p.ply,
    eval: p.evalAfter / 100,
    cpLoss: p.cpLoss,
  }));

  const goToMove = (idx) => {
    if (idx < 0 || idx >= positions.length) return;
    setCurrentMoveIdx(idx);
    if (positions[idx]?.fen) {
      setFen(positions[idx].fen);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link to="/games" className="text-xs font-bold text-slate-400 hover:text-white flex items-center space-x-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Games</span>
        </Link>
        <span className={`px-3 py-1 rounded text-xs font-black uppercase ${
          game.result === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
        }`}>
          Result: {game.result}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Chessboard */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0B0C12] border border-[#181A24] flex flex-col items-center">
            <div className="w-full max-w-[500px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-[#181A24]">
              <Chessboard
                position={fen}
                boardWidth={500}
                arePiecesDraggable={false}
                customLightSquareStyle={{ backgroundColor: '#E6E1D6' }}
                customDarkSquareStyle={{ backgroundColor: '#181A24' }}
              />
            </div>

            {/* Stepper Controls */}
            <div className="flex items-center justify-between w-full max-w-[500px] mt-6 px-4 py-3 rounded-xl bg-[#08090D] border border-[#181A24]">
              <button
                onClick={() => goToMove(0)}
                className="px-3 py-1.5 rounded-lg bg-[#141622] hover:bg-[#181A24] border border-[#181A24] text-xs font-bold text-[#F3EFE6]"
              >
                |&lt; First
              </button>
              <button
                onClick={() => goToMove(currentMoveIdx - 1)}
                className="p-2 rounded-lg bg-[#141622] hover:bg-[#181A24] border border-[#181A24] text-[#F3EFE6]"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-extrabold text-[#F3EFE6]">
                Ply {currentMoveIdx + 1} / {positions.length || 1}
              </span>
              <button
                onClick={() => goToMove(currentMoveIdx + 1)}
                className="p-2 rounded-lg bg-[#141622] hover:bg-[#181A24] border border-[#181A24] text-[#F3EFE6]"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => goToMove(positions.length - 1)}
                className="px-3 py-1.5 rounded-lg bg-[#141622] hover:bg-[#181A24] border border-[#181A24] text-xs font-bold text-[#F3EFE6]"
              >
                Last &gt;|
              </button>
            </div>
          </div>

          {/* Evaluation Trajectory Chart */}
          <div className="p-6 rounded-2xl bg-[#0B0C12] border border-[#181A24] space-y-3">
            <h3 className="text-sm font-bold text-[#F3EFE6] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#C5A059]" />
              <span>Stockfish Evaluation Trajectory</span>
            </h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="ply" tick={{ fill: '#7E8092', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#7E8092', fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0B0C12', borderColor: '#181A24', color: '#F3EFE6' }} />
                  <Line type="monotone" dataKey="eval" stroke="#C5A059" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Move Analysis & Stockfish Recommendations */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#0B0C12] border border-[#181A24] space-y-6">
            <h2 className="text-xl font-black text-[#F3EFE6]">Move-by-Move Analysis</h2>

            {currentAnalysis ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#08090D] border border-[#181A24] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Played Move</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold ${
                      currentAnalysis.classification === 'BEST' ? 'bg-emerald-500/20 text-emerald-400' :
                      currentAnalysis.classification === 'BLUNDER' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {currentAnalysis.classification}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#F3EFE6]">{currentAnalysis.move}</div>
                  <div className="text-xs text-slate-400">
                    Centipawn Loss: <span className="text-[#F3EFE6] font-bold">{currentAnalysis.cpLoss} CP</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#08090D] border border-[#181A24] space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Stockfish Best Alternative
                  </h4>
                  <div className="flex items-center justify-between text-sm font-bold text-emerald-400">
                    <span>{currentAnalysis.bestMove}</span>
                    <span className="text-xs font-normal text-slate-400">Optimal Engine Line</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#08090D] border border-[#181A24] space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Position Characteristics
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>Phase: <span className="text-[#F3EFE6] font-bold">{currentAnalysis.gamePhase}</span></div>
                    <div>Material: <span className="text-[#F3EFE6] font-bold">{currentAnalysis.materialBalance}</span></div>
                    <div>King Safety: <span className="text-[#F3EFE6] font-bold">{Math.round(currentAnalysis.kingSafetyScore)}</span></div>
                    <div>Tactical Score: <span className="text-[#F3EFE6] font-bold">{Math.round(currentAnalysis.tacticalScore)}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                Select a move using the stepper control to view position details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
