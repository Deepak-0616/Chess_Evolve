import React, { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Swords, RotateCcw, Flag, Brain, ChevronRight, Clock } from 'lucide-react';
import { makeMove, createPlaySession } from '../api';

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
              <span style={{ color: '#F5F0E0' }}>{history[i * 2]}</span>
            </div>
            {history[i * 2 + 1] && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded text-xs"
                style={{ background: '#0A0A0A' }}>
                <span style={{ color: '#3A3A3A' }}>{i + 1}...</span>
                <span style={{ color: '#C0A060' }}>{history[i * 2 + 1]}</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    )}
  </div>
);

const Play = () => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [modelType, setModelType] = useState('current');
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | playing | gameover
  const [result, setResult] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [orientation, setOrientation] = useState('white');

  const startGame = async () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen('start');
    setHistory([]);
    setLastMove(null);
    setSelectedSquare(null);
    setResult('');
    setAiThinking(false);

    try {
      const res = await createPlaySession({ modelType, playerColor });
      setSessionId(res.data?.data?.id);
    } catch {
      setSessionId(`demo_${Date.now()}`);
    }

    setStatus('playing');
    setOrientation(playerColor);

    // If AI plays first (player is black)
    if (playerColor === 'black') {
      setTimeout(() => makeAiMove(newGame, `demo_${Date.now()}`), 800);
    }
  };

  const makeAiMove = useCallback(async (currentGame, sid) => {
    setAiThinking(true);
    try {
      const res = await makeMove(sid, null); // null = AI moves
      const aiMoveData = res.data?.data?.aiMove;
      if (aiMoveData) {
        const move = currentGame.move(aiMoveData);
        if (move) {
          setGame(new Chess(currentGame.fen()));
          setFen(currentGame.fen());
          setLastMove({ from: move.from, to: move.to });
          setHistory(prev => [...prev, move.san]);
          checkGameEnd(currentGame);
        }
      } else {
        // Demo: random legal move
        const moves = currentGame.moves({ verbose: true });
        if (moves.length > 0) {
          const aiMove = moves[Math.floor(Math.random() * moves.length)];
          currentGame.move(aiMove);
          setGame(new Chess(currentGame.fen()));
          setFen(currentGame.fen());
          setLastMove({ from: aiMove.from, to: aiMove.to });
          setHistory(prev => [...prev, aiMove.san]);
          checkGameEnd(currentGame);
        }
      }
    } catch {
      // Demo fallback
      const moves = currentGame.moves({ verbose: true });
      if (moves.length > 0) {
        const aiMove = moves[Math.floor(Math.random() * moves.length)];
        currentGame.move(aiMove);
        setGame(new Chess(currentGame.fen()));
        setFen(currentGame.fen());
        setLastMove({ from: aiMove.from, to: aiMove.to });
        setHistory(prev => [...prev, aiMove.san]);
        checkGameEnd(currentGame);
      }
    }
    setAiThinking(false);
  }, []);

  const checkGameEnd = (g) => {
    if (g.isGameOver()) {
      let res = 'Draw';
      if (g.isCheckmate()) res = g.turn() === 'w' ? 'Black wins' : 'White wins';
      setResult(res);
      setStatus('gameover');
    }
  };

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

      if (game.isGameOver()) {
        checkGameEnd(game);
        return true;
      }

      setTimeout(() => makeAiMove(newGame, sessionId), 500);
      return true;
    } catch {
      return false;
    }
  }, [game, status, aiThinking, playerColor, sessionId, makeAiMove]);

  const handleResign = () => {
    setResult('You resigned');
    setStatus('gameover');
  };

  const customSquareStyles = {};
  if (lastMove) {
    customSquareStyles[lastMove.from] = { backgroundColor: LAST_MOVE_LIGHT };
    customSquareStyles[lastMove.to] = { backgroundColor: LAST_MOVE_DARK };
  }
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: SELECTED_SQUARE };
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>Play Your AI Self</h2>
        <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>Challenge your personalized AI model on the board</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Board */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden p-4"
            style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
            {/* AI status bar */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)' }}>
                  <Brain size={11} style={{ color: '#080808' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#C0A060' }}>
                  {modelType === 'current' ? 'Current Self AI' : 'Peak Self AI'}
                </span>
                {aiThinking && (
                  <div className="flex items-center space-x-1.5 text-xs" style={{ color: '#D4AF37' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" style={{ background: '#D4AF37' }} />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
              <span className="text-xs" style={{ color: '#3A3A3A' }}>
                {status === 'playing' ? `${game.moveNumber()} moves` : status}
              </span>
            </div>

            {/* Chessboard */}
            <div className="w-full aspect-square rounded-xl overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6)' }}>
              <Chessboard
                position={fen}
                onPieceDrop={onDrop}
                boardOrientation={orientation}
                animationDuration={150}
                customSquareStyles={customSquareStyles}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: 'none',
                }}
                customLightSquareStyle={{ backgroundColor: LIGHT_SQUARE }}
                customDarkSquareStyle={{ backgroundColor: DARK_SQUARE }}
                arePiecesDraggable={status === 'playing' && !aiThinking && game.turn() === playerColor[0]}
              />
            </div>

            {/* Player bar */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#6B6B6B' }}>You ({playerColor})</span>
              </div>
              {status === 'playing' && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: game.turn() === playerColor[0] ? 'rgba(212,175,55,0.12)' : '#111',
                    color: game.turn() === playerColor[0] ? '#D4AF37' : '#3A3A3A',
                    border: `1px solid ${game.turn() === playerColor[0] ? 'rgba(212,175,55,0.25)' : '#1A1A1A'}`,
                  }}>
                  {game.turn() === playerColor[0] ? 'Your turn' : 'AI thinking'}
                </span>
              )}
            </div>
          </div>

          {/* Game over overlay */}
          {status === 'gameover' && (
            <div className="mt-3 p-4 rounded-xl text-center"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
              <p className="font-bold text-lg" style={{ color: '#D4AF37' }}>Game Over</p>
              <p className="text-sm mt-1" style={{ color: '#6B6B6B' }}>{result}</p>
              <button onClick={startGame} className="mt-3 px-6 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {status === 'idle' && (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
              <h3 className="font-bold text-sm" style={{ color: '#F5F0E0' }}>Game Setup</h3>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#4A4A4A' }}>
                  AI Model
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'current', label: 'Current Self', desc: 'Your recent form' },
                    { value: 'peak', label: 'Peak Self', desc: 'Your best performance' },
                  ].map(({ value, label, desc }) => (
                    <button key={value} onClick={() => setModelType(value)}
                      className="w-full flex items-center space-x-3 p-3 rounded-xl text-left transition-all"
                      style={{
                        background: modelType === value ? 'rgba(212,175,55,0.1)' : '#0A0A0A',
                        border: `1px solid ${modelType === value ? 'rgba(212,175,55,0.3)' : '#1A1A1A'}`,
                      }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: modelType === value ? '#D4AF37' : '#3A3A3A' }}>
                        {modelType === value && <div className="w-2 h-2 rounded-full" style={{ background: '#D4AF37' }} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: modelType === value ? '#D4AF37' : '#F5F0E0' }}>{label}</div>
                        <div className="text-xs" style={{ color: '#4A4A4A' }}>{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#4A4A4A' }}>
                  Play As
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['white', 'black'].map(color => (
                    <button key={color} onClick={() => setPlayerColor(color)}
                      className="py-2.5 rounded-xl text-xs font-bold capitalize transition-all"
                      style={{
                        background: playerColor === color ? 'rgba(212,175,55,0.12)' : '#0A0A0A',
                        color: playerColor === color ? '#D4AF37' : '#6B6B6B',
                        border: `1px solid ${playerColor === color ? 'rgba(212,175,55,0.3)' : '#1A1A1A'}`,
                      }}>
                      {color === 'white' ? '♔ White' : '♚ Black'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={startGame}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}>
                <Swords size={16} />
                <span>Start Game</span>
              </button>
            </div>
          )}

          {status !== 'idle' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#111' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Moves</span>
                <span className="text-xs" style={{ color: '#3A3A3A' }}>{history.length} total</span>
              </div>
              <MoveList history={history} />
              {status === 'playing' && (
                <div className="flex space-x-2 p-3 border-t" style={{ borderColor: '#111' }}>
                  <button onClick={() => { setGame(new Chess()); setFen('start'); setHistory([]); setLastMove(null); setStatus('idle'); }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ background: '#111', color: '#6B6B6B', border: '1px solid #1A1A1A' }}>
                    <RotateCcw size={11} />
                    <span>New</span>
                  </button>
                  <button onClick={handleResign}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <Flag size={11} />
                    <span>Resign</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="p-4 rounded-xl space-y-2"
            style={{ background: '#0A0A0A', border: '1px solid #111' }}>
            <p className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>Tips</p>
            <p className="text-xs leading-relaxed" style={{ color: '#3A3A3A' }}>
              Your AI self has been trained on your game history. It knows your tactical tendencies, favorite openings, and endgame technique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Play;
