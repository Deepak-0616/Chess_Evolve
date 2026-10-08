import React, { useState, useCallback, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Swords, RotateCcw, Flag, Brain, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useParams, useNavigate } from 'react-router-dom';

const LIGHT_SQUARE = '#E6E1D6';
const DARK_SQUARE = '#181A24';
const SELECTED_SQUARE = 'rgba(197, 160, 89, 0.35)';
const LAST_MOVE_LIGHT = 'rgba(197, 160, 89, 0.2)';
const LAST_MOVE_DARK = 'rgba(197, 160, 89, 0.3)';

const MoveList = ({ history }) => (
  <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '250px' }}>
    {history.length === 0 ? (
      <p className="text-xs text-center py-6" style={{ color: '#7E8092' }}>No moves yet</p>
    ) : (
      <div className="grid grid-cols-2 gap-1">
        {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center space-x-2 px-2 py-1 rounded text-xs"
              style={{ background: '#06070A', border: '1px solid #181A24' }}>
              <span style={{ color: '#7E8092' }}>{i + 1}.</span>
              <span style={{ color: '#F3EFE6' }}>{history[i * 2]?.move || history[i * 2]}</span>
            </div>
            {history[i * 2 + 1] && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded text-xs"
                style={{ background: '#06070A', border: '1px solid #181A24' }}>
                <span style={{ color: '#7E8092' }}>{i + 1}...</span>
                <span style={{ color: '#C5A059' }}>{history[i * 2 + 1]?.move || history[i * 2 + 1]}</span>
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
            style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
            
            {/* Top Player (Opponent) */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #B58D3D, #D4B46A)' }}>
                  <Brain size={11} style={{ color: '#040406' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#D4B46A' }}>
                  Opponent AI ({playerColor === 'white' ? 'Black' : 'White'})
                </span>
                {aiThinking && (
                  <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#C5A059' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" style={{ background: '#C5A059' }} />
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
                  style={{ background: '#141622', border: '1px solid #181A24' }}>
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#7E8092' }}>You ({playerColor})</span>
              </div>
            </div>
          </div>

          {status === 'gameover' && (
            <div className="mt-3 p-4 rounded-xl text-center"
              style={{ background: 'rgba(197, 160, 89, 0.08)', border: '1px solid rgba(197, 160, 89, 0.25)' }}>
              <p className="font-bold text-lg" style={{ color: '#C5A059' }}>Game Over</p>
              <p className="text-sm mt-1" style={{ color: '#7E8092' }}>{result}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#181A24' }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#7E8092' }}>Moves</span>
              <span className="text-xs" style={{ color: '#7E8092' }}>{history.length} total</span>
            </div>
            <MoveList history={history} />
            {status === 'playing' && (
              <div className="flex space-x-2 p-3 border-t" style={{ borderColor: '#181A24' }}>
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
