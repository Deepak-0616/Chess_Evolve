import React, { useState, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Swords, RotateCcw, Flag, Brain, ChevronRight, Clock } from 'lucide-react';
import { makeMove, createPlaySession } from '../api';

const LIGHT_SQUARE = '#FFFFFF';
const DARK_SQUARE = '#1C1C1E';
const SELECTED_SQUARE = 'rgba(197, 160, 89, 0.4)';
const LAST_MOVE_LIGHT = 'rgba(197, 160, 89, 0.2)';
const LAST_MOVE_DARK = 'rgba(197, 160, 89, 0.32)';

const MoveList = ({ history }) => (
  <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '250px' }}>
    {history.length === 0 ? (
      <p className="text-xs text-center py-6" style={{ color: '#5A5D70' }}>No moves yet</p>
    ) : (
      <div className="grid grid-cols-2 gap-1">
        {Array.from({ length: Math.ceil(history.length / 2) }, (_, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center space-x-2 px-2 py-1 rounded text-xs"
              style={{ background: '#0D0E14' }}>
              <span style={{ color: '#5A5D70' }}>{i + 1}.</span>
              <span style={{ color: '#F3EFE6' }}>{history[i * 2]}</span>
            </div>
            {history[i * 2 + 1] && (
              <div className="flex items-center space-x-2 px-2 py-1 rounded text-xs"
                style={{ background: '#0D0E14' }}>
                <span style={{ color: '#5A5D70' }}>{i + 1}...</span>
                <span style={{ color: '#D4B46A' }}>{history[i * 2 + 1]}</span>
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
  const queryParams = new URLSearchParams(window.location.search);
  const initialOpponent = queryParams.get('opponent') === 'peak-self' ? 'peak' : 'current';
  const [modelType, setModelType] = useState(initialOpponent);
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
      const res = await createPlaySession({ 
        opponentModelType: modelType === 'current' ? 'CURRENT_SELF' : 'PEAK_SELF', 
        userColor: playerColor 
      });
      setSessionId(res.data?.session?.id);
      
      setStatus('playing');
      setOrientation(playerColor);

      // If AI plays first (player is black)
      if (playerColor === 'black' && res.data?.aiMove) {
        const move = newGame.move(res.data.aiMove);
        if (move) {
          setGame(new Chess(newGame.fen()));
          setFen(newGame.fen());
          setLastMove({ from: move.from, to: move.to });
          setHistory(prev => [...prev, move.san]);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus('idle');
      return;
    }
  };

  const makeAiMove = useCallback(async (currentGame, sid) => {
    setAiThinking(true);
    try {
      const res = await makeMove(sid, null);
      const aiMoveData = res.data?.aiMove;
      if (aiMoveData) {
        const move = currentGame.move(aiMoveData);
        if (move) {
          setGame(new Chess(currentGame.fen()));
          setFen(currentGame.fen());
          setLastMove({ from: move.from, to: move.to });
          setHistory(prev => [...prev, move.san]);
          checkGameEnd(currentGame);
        }
      }
    } catch (err) {
      console.error(err);
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
        <h2 className="text-xl font-bold font-display" style={{ color: '#F3EFE6' }}>Play Your AI Self</h2>
        <p className="text-sm mt-0.5" style={{ color: '#7E8092' }}>Challenge your personalized AI model on the board</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Board */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl overflow-hidden p-4"
            style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            {/* AI status bar */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #B58D3D, #926E28)' }}>
                  <Brain size={11} style={{ color: '#040406' }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#D4B46A' }}>
                  {modelType === 'current' ? 'Current Self AI' : 'Peak Self AI'}
                </span>
                {aiThinking && (
                  <div className="flex items-center space-x-1.5 text-xs font-medium" style={{ color: '#D4B46A' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D4B46A' }} />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
              <span className="text-xs" style={{ color: '#7E8092' }}>
                {status === 'playing' ? `${game.moveNumber()} moves` : status}
              </span>
            </div>

            {/* Chessboard */}
            <div className="w-full aspect-square rounded-xl overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}>
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
                  style={{ background: '#141622', border: '1px solid #1E202E' }}>
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: '#8A8D9F' }}>You ({playerColor})</span>
              </div>
              {status === 'playing' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: game.turn() === playerColor[0] ? 'rgba(197,160,89,0.14)' : 'rgba(255,255,255,0.03)',
                    color: game.turn() === playerColor[0] ? '#D4B46A' : '#7E8092',
                    border: `1px solid ${game.turn() === playerColor[0] ? 'rgba(197,160,89,0.3)' : '#181A24'}`,
                  }}>
                  {game.turn() === playerColor[0] ? 'Your turn' : 'AI thinking'}
                </span>
              )}
            </div>
          </div>

          {/* Game over overlay */}
          {status === 'gameover' && (
            <div className="mt-3 p-4 rounded-xl text-center shadow-lg"
              style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.25)' }}>
              <p className="font-bold text-lg" style={{ color: '#D4B46A' }}>Game Over</p>
              <p className="text-sm mt-1" style={{ color: '#8A8D9F' }}>{result}</p>
              <button onClick={startGame} className="mt-3 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
                style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)', color: '#040406' }}>
                Play Again
              </button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {status === 'idle' && (
            <div className="rounded-2xl p-5 space-y-4 shadow-lg"
              style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
              <h3 className="font-bold text-sm tracking-wide" style={{ color: '#F3EFE6' }}>Game Setup</h3>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#7E8092' }}>
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
                        background: modelType === value ? 'rgba(197,160,89,0.12)' : '#0E1017',
                        border: `1px solid ${modelType === value ? 'rgba(197,160,89,0.35)' : '#181A24'}`,
                      }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={{ borderColor: modelType === value ? '#D4B46A' : '#5A5D70' }}>
                        {modelType === value && <div className="w-2 h-2 rounded-full" style={{ background: '#D4B46A' }} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: modelType === value ? '#D4B46A' : '#F3EFE6' }}>{label}</div>
                        <div className="text-xs" style={{ color: '#7E8092' }}>{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#7E8092' }}>
                  Play As
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['white', 'black'].map(color => (
                    <button key={color} onClick={() => setPlayerColor(color)}
                      className="py-2.5 rounded-xl text-xs font-bold capitalize transition-all"
                      style={{
                        background: playerColor === color ? 'rgba(197,160,89,0.14)' : '#0E1017',
                        color: playerColor === color ? '#D4B46A' : '#8A8D9F',
                        border: `1px solid ${playerColor === color ? 'rgba(197,160,89,0.35)' : '#181A24'}`,
                      }}>
                      {color === 'white' ? '♔ White' : '♚ Black'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={startGame}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-sm transition-all shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)',
                  color: '#040406',
                  boxShadow: '0 4px 20px rgba(181, 141, 61, 0.28)',
                }}>
                <Swords size={16} />
                <span>Start Game</span>
              </button>
            </div>
          )}

          {status !== 'idle' && (
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#181A24' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8A8D9F' }}>Moves</span>
                <span className="text-xs" style={{ color: '#7E8092' }}>{history.length} total</span>
              </div>
              <MoveList history={history} />
              {status === 'playing' && (
                <div className="flex space-x-2 p-3 border-t" style={{ borderColor: '#181A24' }}>
                  <button onClick={() => { setGame(new Chess()); setFen('start'); setHistory([]); setLastMove(null); setStatus('idle'); }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ background: '#12141C', color: '#8A8D9F', border: '1px solid #181A24' }}>
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
            style={{ background: '#08090D', border: '1px solid #181A24' }}>
            <p className="text-xs font-semibold" style={{ color: '#8A8D9F' }}>Tips</p>
            <p className="text-xs leading-relaxed" style={{ color: '#7E8092' }}>
              Your AI self has been trained on your game history. It knows your tactical tendencies, favorite openings, and endgame technique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Play;
