import React, { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Swords, RotateCcw, Flag, Brain, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useParams, useNavigate } from 'react-router-dom';

const LIGHT_SQUARE = '#FFFFFF';
const DARK_SQUARE = '#1C1C1E';
const SELECTED_SQUARE = 'rgba(212,175,55,0.35)';
const LAST_MOVE_LIGHT = 'rgba(212,175,55,0.2)';
const LAST_MOVE_DARK = 'rgba(212,175,55,0.3)';

const MoveList = ({ history }) => (
  <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '250px' }}>
    {history.length === 0 ? (
      <p className="text-xs text-center py-6" style={{ color: '#3A3A3A' }}>No moves yet</p>
    ) : (
      <div className="grid grid-cols-2 gap-1">
        {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center space-x-2 px-2 py-1 rounded text-xs"
              style={{ background: '#0A0A0A' }}>
              <span style={{ color: '#3A3A3A' }}>{i + 1}.</span>
              <span style={{ color: '#F5F0E0' }}>{history[i * 2]?.move || history[i * 2]}</span>
            </div>
            {history[i * 2 + 1] && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded text-xs"
                style={{ background: '#0A0A0A' }}>
                <span style={{ color: '#3A3A3A' }}>{i + 1}...</span>
                <span style={{ color: '#C0A060' }}>{history[i * 2 + 1]?.move || history[i * 2 + 1]}</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    )}
  </div>
);

const ArenaMatch = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [status, setStatus] = useState('loading'); // loading | playing | gameover
  const [result, setResult] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [orientation, setOrientation] = useState('white');

  useEffect(() => {
    async function loadMatch() {
      try {
        const res = await apiClient.get(`/arena/matches/${matchId}`);
        const m = res.data.match;
        setMatch(m);
        setFen(m.fen);
        setGame(new Chess(m.fen));
        setHistory(m.moveHistory || []);
        
        // Find player color
        // Assuming current user is challenger
        const isWhite = !m.whiteModelVersionId;
        setPlayerColor(isWhite ? 'white' : 'black');
        setOrientation(isWhite ? 'white' : 'black');
        
        if (m.status !== 'IN_PROGRESS') {
          setStatus('gameover');
          setResult(m.result || m.status);
        } else {
          setStatus('playing');
          // If it's AI turn, request a move (e.g. AI is white and makes first move)
          const newGame = new Chess(m.fen);
          if (newGame.turn() === (isWhite ? 'b' : 'w')) {
            makeAiMove(newGame);
          }
        }
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    }
    loadMatch();
    // eslint-disable-next-line
  }, [matchId]);

  const makeAiMove = useCallback(async (currentGame) => {
    setAiThinking(true);
    try {
      const res = await apiClient.post(`/arena/matches/${matchId}/moves`, { move: null });
      const aiMoveData = res.data?.aiMove;
      if (aiMoveData) {
        const move = currentGame.move(aiMoveData);
        if (move) {
          setGame(new Chess(currentGame.fen()));
          setFen(currentGame.fen());
          setLastMove({ from: move.from, to: move.to });
          setHistory(res.data.match.moveHistory);
          if (res.data.isGameOver) {
            setResult(res.data.match.result);
            setStatus('gameover');
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
    setAiThinking(false);
  }, [matchId]);

  const onDrop = useCallback((sourceSquare, targetSquare) => {
    if (status !== 'playing' || aiThinking) return false;
    if (game.turn() !== playerColor[0]) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (!move) return false;

      const newGame = new Chess(game.fen());
      setGame(newGame);
      setFen(game.fen());
      setLastMove({ from: sourceSquare, to: targetSquare });
      setHistory(prev => [...prev, move.san]);
      setSelectedSquare(null);

      // Send to server
      apiClient.post(`/arena/matches/${matchId}/moves`, { move: move.san })
        .then(res => {
          setHistory(res.data.match.moveHistory);
          if (res.data.isGameOver) {
            setResult(res.data.match.result);
            setStatus('gameover');
          } else if (res.data.aiMove) {
            const mg = new Chess(res.data.match.fen);
            setGame(mg);
            setFen(mg.fen());
          }
        })
        .catch(err => {
          console.error(err);
          // Revert on fail
        });

      return true;
    } catch {
      return false;
    }
  }, [game, status, aiThinking, playerColor, matchId]);

  const handleResign = async () => {
    try {
      await apiClient.post(`/arena/matches/${matchId}/resign`);
      setResult('You resigned');
      setStatus('gameover');
    } catch (e) {
      console.error(e);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
      </div>
    );
  }

  const customSquareStyles = {};
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: LAST_MOVE_LIGHT };
    customSquareStyles[lastMove.to] = { backgroundColor: LAST_MOVE_DARK };
  }
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: SELECTED_SQUARE };
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>Arena Match</h2>
          <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>{match?.whiteProfile?.user?.displayName || 'Unknown'} vs {match?.blackProfile?.user?.displayName || 'Unknown'}</p>
        </div>
        <button onClick={() => navigate('/arena')} className="text-sm text-slate-400 hover:text-white">
          Back to Arena
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden p-4"
            style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            
            {/* Top Player (Opponent) */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
                  <Brain size={11} style={{ color: '#080808' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#C0A060' }}>
                  Opponent AI ({playerColor === 'white' ? 'Black' : 'White'})
                </span>
                {aiThinking && (
                  <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#D4AF37' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" style={{ background: '#D4AF37' }} />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full aspect-square rounded-xl overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}>
              <Chessboard
                position={fen}
                onPieceDrop={onDrop}
                boardOrientation={orientation}
                animationDuration={150}
                customSquareStyles={customSquareStyles}
                customBoardStyle={{ borderRadius: '8px', boxShadow: 'none' }}
                customLightSquareStyle={{ backgroundColor: LIGHT_SQUARE }}
                customDarkSquareStyle={{ backgroundColor: DARK_SQUARE }}
                arePiecesDraggable={status === 'playing' && !aiThinking && game.turn() === playerColor[0]}
              />
            </div>

            {/* Bottom Player (You) */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#6B6B6B' }}>You ({playerColor})</span>
              </div>
            </div>
          </div>

          {status === 'gameover' && (
            <div className="mt-3 p-4 rounded-xl text-center"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
              <p className="font-bold text-lg" style={{ color: '#D4AF37' }}>Game Over</p>
              <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>{result}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#111' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Moves</span>
              <span className="text-xs" style={{ color: '#3A3A3A' }}>{history.length} total</span>
            </div>
            <MoveList history={history} />
            {status === 'playing' && (
              <div className="flex space-x-2 p-3 border-t" style={{ borderColor: '#111' }}>
                <button onClick={handleResign}
                  className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Flag size={11} />
                  <span>Resign</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArenaMatch;
