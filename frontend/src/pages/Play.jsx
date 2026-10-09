import React, { useState, useEffect, useCallback } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Swords, RotateCcw, Flag, Brain, Sparkles, User, AlertCircle, CheckCircle2, Palette, Link as LinkIcon } from 'lucide-react';
import { makeMove, createPlaySession, getChessProfile, getModels, getMe } from '../api';
import { Link } from 'react-router-dom';

const BOARD_THEMES = {
  tournament: {
    name: 'Tournament',
    light: '#EEEED2',
    dark: '#769656',
    selected: 'rgba(247, 209, 87, 0.55)',
    lastLight: 'rgba(247, 209, 87, 0.4)',
    lastDark: 'rgba(247, 209, 87, 0.6)',
  },
  wood: {
    name: 'Walnut',
    light: '#F0D9B5',
    dark: '#B58863',
    selected: 'rgba(255, 170, 0, 0.5)',
    lastLight: 'rgba(255, 200, 0, 0.4)',
    lastDark: 'rgba(255, 200, 0, 0.55)',
  },
  slate: {
    name: 'Steel Slate',
    light: '#E2E8F0',
    dark: '#64748B',
    selected: 'rgba(56, 189, 248, 0.5)',
    lastLight: 'rgba(56, 189, 248, 0.35)',
    lastDark: 'rgba(56, 189, 248, 0.5)',
  },
};

const MoveList = ({ history }) => (
  <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '220px' }}>
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
  const [boardTheme, setBoardTheme] = useState('tournament');
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | playing | gameover
  const [result, setResult] = useState('');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [playerColor, setPlayerColor] = useState('white');
  const [orientation, setOrientation] = useState('white');
  const [errorMsg, setErrorMsg] = useState(null);
  const [profile, setProfile] = useState(null);
  const [models, setModels] = useState([]);
  const [lastAiDecision, setLastAiDecision] = useState(null);

  useEffect(() => {
    getChessProfile()
      .then(res => {
        const p = res.data?.chessProfile || res.data?.data || res.data?.profile || res.data;
        if (p && typeof p === 'object' && p.chessUsername) {
          setProfile(p);
        } else {
          getMe()
            .then(meRes => {
              const cp = meRes.data?.user?.chessProfile;
              if (cp && cp.chessUsername) setProfile(cp);
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('Could not load profile:', err);
        getMe()
          .then(meRes => {
            const cp = meRes.data?.user?.chessProfile;
            if (cp && cp.chessUsername) setProfile(cp);
          })
          .catch(() => {});
      });

    getModels()
      .then(res => {
        const raw = res.data?.models || res.data;
        if (Array.isArray(raw)) {
          setModels(raw);
        } else if (raw && Array.isArray(raw.allVersions)) {
          setModels(raw.allVersions);
        } else if (res.data?.allVersions && Array.isArray(res.data.allVersions)) {
          setModels(res.data.allVersions);
        } else {
          setModels([]);
        }
      })
      .catch((err) => {
        console.warn('Could not load models:', err);
      });
  }, []);

  const connectedUsername = profile?.chessUsername || null;
  const currentTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.tournament;

  const startGame = async () => {
    setErrorMsg(null);
    setLastAiDecision(null);
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
      const sid = res.data?.session?.id;
      setSessionId(sid);
      setStatus('playing');
      setOrientation(playerColor);

      // If AI plays first (player is black)
      if (playerColor === 'black' && res.data?.aiMove) {
        const move = newGame.move(res.data.aiMove);
        if (move) {
          setGame(new Chess(newGame.fen()));
          setFen(newGame.fen());
          setLastMove({ from: move.from, to: move.to });
          setHistory([move.san]);
          if (res.data.prediction) {
            setLastAiDecision({
              move: move.san,
              confidence: res.data.prediction.confidence,
              rank: res.data.prediction.chosenEngineRank,
              modelType: modelType === 'current' ? 'Current Self' : 'Peak Self'
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to start game session. Ensure your Chess.com games are synced.');
      setStatus('idle');
    }
  };

  const checkGameEnd = (g) => {
    if (g.isGameOver()) {
      let res = 'Draw';
      if (g.isCheckmate()) res = g.turn() === 'w' ? 'Black wins' : 'White wins';
      else if (g.isDraw()) res = 'Game drawn';
      setResult(res);
      setStatus('gameover');
    }
  };

  const makeAiMove = useCallback(async (currentGame, sid, userMoveSan) => {
    setAiThinking(true);
    setErrorMsg(null);
    try {
      const res = await makeMove(sid, userMoveSan);
      const aiMoveData = res.data?.aiMove;
      if (aiMoveData) {
        let move = null;
        try {
          move = currentGame.move(aiMoveData);
        } catch {
          try {
            const from = aiMoveData.substring(0, 2);
            const to = aiMoveData.substring(2, 4);
            const promotion = aiMoveData.length > 4 ? aiMoveData.substring(4, 5) : undefined;
            move = currentGame.move({ from, to, promotion });
          } catch (e) {
            console.error('Failed to parse AI move on board', e);
          }
        }

        if (move) {
          setGame(new Chess(currentGame.fen()));
          setFen(currentGame.fen());
          setLastMove({ from: move.from, to: move.to });
          setHistory(prev => [...prev, move.san]);
          checkGameEnd(currentGame);

          if (res.data?.prediction) {
            setLastAiDecision({
              move: move.san,
              confidence: res.data.prediction.confidence,
              rank: res.data.prediction.chosenEngineRank,
              modelType: modelType === 'current' ? 'Current Self' : 'Peak Self'
            });
          }
        }
      }

      if (res.data?.isGameOver) {
        checkGameEnd(currentGame);
      }
    } catch (err) {
      console.error('AI Move error:', err);
      setErrorMsg(err.response?.data?.error || 'Error processing AI move.');
    }
    setAiThinking(false);
  }, [modelType]);

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

      if (newGame.isGameOver()) {
        checkGameEnd(newGame);
        return true;
      }

      setTimeout(() => makeAiMove(newGame, sessionId, move.san), 300);
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
    customSquareStyles[lastMove.from] = { backgroundColor: currentTheme.lastLight };
    customSquareStyles[lastMove.to] = { backgroundColor: currentTheme.lastDark };
  }
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = { backgroundColor: currentTheme.selected };
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-display" style={{ color: '#F3EFE6' }}>Play Your AI Self</h2>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: '#7E8092' }}>
            {connectedUsername ? (
              <>
                Trained on the genuine game history of{' '}
                <span className="font-semibold text-amber-300">@{connectedUsername}</span>
              </>
            ) : (
              'Personalized neural chess models trained on your playing tendencies.'
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Board Theme Picker */}
          <div className="flex items-center space-x-1 p-1 rounded-xl"
            style={{ background: '#0D0E14', border: '1px solid #1E202E' }}>
            {Object.entries(BOARD_THEMES).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setBoardTheme(key)}
                className={`text-[11px] px-2 py-1 rounded-lg font-medium transition-all ${
                  boardTheme === key ? 'text-amber-300 bg-amber-500/10' : 'text-gray-400 hover:text-gray-200'
                }`}
                title={`Switch to ${t.name} theme`}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Account status badge */}
          <div className="flex items-center space-x-2 text-xs px-3 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: '#0D0E14', border: '1px solid #1E202E' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: connectedUsername ? '#10B981' : '#F59E0B' }} />
            <span style={{ color: '#A1A4B5' }}>
              {connectedUsername ? `Linked: @${connectedUsername}` : 'No account linked'}
            </span>
          </div>
        </div>
      </div>

      {/* No account banner */}
      {!connectedUsername && (
        <div className="flex items-center justify-between p-3.5 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#FDE68A' }}>
          <div className="flex items-center space-x-2.5">
            <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
            <span>Connect your Chess.com profile to play against your authentic neural clones.</span>
          </div>
          <Link
            to="/connect"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-500 text-black hover:bg-amber-400 transition-all flex-shrink-0 ml-3"
          >
            <LinkIcon size={12} />
            <span>Connect Profile</span>
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-3 p-3.5 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Play Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Chess Board */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[500px] rounded-2xl p-3 sm:p-4 shadow-2xl"
            style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
            {/* Top AI Opponent Status */}
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
                  style={{ background: modelType === 'peak' ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #B58D3D, #926E28)' }}>
                  {modelType === 'peak' ? <Sparkles size={11} style={{ color: '#FFFFFF' }} /> : <Brain size={11} style={{ color: '#040406' }} />}
                </div>
                <div>
                  <span className="text-xs font-semibold mr-2" style={{ color: modelType === 'peak' ? '#34D399' : '#D4B46A' }}>
                    {modelType === 'current' ? `Current Self (${connectedUsername || 'User'})` : `Peak Self (${connectedUsername || 'User'})`}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded text-gray-400 bg-gray-900 border border-gray-800">
                    {modelType === 'current' ? 'Style Mirror' : 'Tactical Master'}
                  </span>
                </div>
                {aiThinking && (
                  <div className="flex items-center space-x-1.5 text-xs font-medium ml-1.5" style={{ color: '#D4B46A' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#D4B46A' }} />
                    <span>Thinking...</span>
                  </div>
                )}
              </div>
              <span className="text-xs" style={{ color: '#7E8092' }}>
                {status === 'playing' ? `Move ${Math.floor(game.moveNumber())}` : status.toUpperCase()}
              </span>
            </div>

            {/* High-Contrast Chessboard Container */}
            <div className="w-full aspect-square rounded-xl overflow-hidden shadow-inner"
              style={{ border: '2px solid #1A1D28' }}>
              <Chessboard
                position={fen}
                onPieceDrop={onDrop}
                boardOrientation={orientation}
                animationDuration={150}
                customSquareStyles={customSquareStyles}
                customBoardStyle={{
                  borderRadius: '10px',
                  boxShadow: 'none',
                }}
                customLightSquareStyle={{ backgroundColor: currentTheme.light }}
                customDarkSquareStyle={{ backgroundColor: currentTheme.dark }}
                arePiecesDraggable={status === 'playing' && !aiThinking && game.turn() === playerColor[0]}
              />
            </div>

            {/* Bottom Player Status Bar */}
            <div className="flex items-center justify-between mt-2.5 px-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: '#141622', border: '1px solid #1E202E' }}>
                  <User size={12} className="text-gray-400" />
                </div>
                <span className="text-xs font-semibold" style={{ color: '#8A8D9F' }}>
                  You ({playerColor.toUpperCase()})
                </span>
              </div>
              {status === 'playing' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: game.turn() === playerColor[0] ? 'rgba(197,160,89,0.14)' : 'rgba(255,255,255,0.03)',
                    color: game.turn() === playerColor[0] ? '#D4B46A' : '#7E8092',
                    border: `1px solid ${game.turn() === playerColor[0] ? 'rgba(197,160,89,0.3)' : '#181A24'}`,
                  }}>
                  {game.turn() === playerColor[0] ? 'Your turn' : 'AI calculating'}
                </span>
              )}
            </div>

            {/* AI Decision telemetry */}
            {lastAiDecision && (
              <div className="mt-2.5 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs"
                style={{ background: '#0D0E14', border: '1px solid #1A1C28' }}>
                <div className="flex items-center space-x-1.5">
                  <span className="text-gray-400">AI Choice:</span>
                  <span className="font-bold text-amber-400">{lastAiDecision.move}</span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-gray-400">
                  {lastAiDecision.confidence && (
                    <span>Confidence: <strong className="text-gray-200">{(lastAiDecision.confidence * 100).toFixed(1)}%</strong></span>
                  )}
                  {lastAiDecision.rank && (
                    <span>Rank: <strong className="text-gray-200">#{lastAiDecision.rank}</strong></span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Game over modal/card */}
          {status === 'gameover' && (
            <div className="w-full max-w-[500px] mt-3 p-4 rounded-xl text-center shadow-lg"
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

        {/* Right Column: Game Setup & Move History */}
        <div className="lg:col-span-5 space-y-4">
          {status === 'idle' ? (
            <div className="rounded-2xl p-5 space-y-4 shadow-lg"
              style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
              <h3 className="font-bold text-sm tracking-wide" style={{ color: '#F3EFE6' }}>Match Configuration</h3>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#7E8092' }}>
                  Select Neural Clone
                </label>
                <div className="space-y-2.5">
                  {[
                    {
                      value: 'current',
                      label: 'Current Self',
                      desc: `Reproduces ${connectedUsername || 'your'} actual move distributions, openings, and tactical risk appetite.`
                    },
                    {
                      value: 'peak',
                      label: 'Peak Self',
                      desc: `Retains ${connectedUsername || 'your'} signature style while filtering blunders and playing superior moves.`
                    },
                  ].map(({ value, label, desc }) => (
                    <button key={value} onClick={() => setModelType(value)}
                      className="w-full flex items-start space-x-3 p-3.5 rounded-xl text-left transition-all"
                      style={{
                        background: modelType === value ? 'rgba(197,160,89,0.12)' : '#0E1017',
                        border: `1px solid ${modelType === value ? 'rgba(197,160,89,0.35)' : '#181A24'}`,
                      }}>
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ borderColor: modelType === value ? '#D4B46A' : '#5A5D70' }}>
                        {modelType === value && <div className="w-2 h-2 rounded-full" style={{ background: '#D4B46A' }} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: modelType === value ? '#D4B46A' : '#F3EFE6' }}>{label}</div>
                        <div className="text-[11px] leading-relaxed mt-1" style={{ color: '#8A8D9F' }}>{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: '#7E8092' }}>
                  Side
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
                      {color === 'white' ? '♔ Play as White' : '♚ Play as Black'}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={startGame}
                className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md hover:brightness-110"
                style={{
                  background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)',
                  color: '#040406',
                  boxShadow: '0 4px 20px rgba(181, 141, 61, 0.28)',
                }}>
                <Swords size={16} />
                <span>Start Match</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#181A24' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8A8D9F' }}>Move Log</span>
                <span className="text-xs" style={{ color: '#7E8092' }}>{history.length} moves</span>
              </div>
              <MoveList history={history} />
              {status === 'playing' && (
                <div className="flex space-x-2 p-3 border-t" style={{ borderColor: '#181A24' }}>
                  <button onClick={() => { setGame(new Chess()); setFen('start'); setHistory([]); setLastMove(null); setStatus('idle'); }}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: '#12141C', color: '#8A8D9F', border: '1px solid #181A24' }}>
                    <RotateCcw size={12} />
                    <span>Reset</span>
                  </button>
                  <button onClick={handleResign}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <Flag size={12} />
                    <span>Resign</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Model Decision Objectives Card */}
          <div className="p-4 rounded-xl space-y-2.5"
            style={{ background: '#08090D', border: '1px solid #181A24' }}>
            <p className="text-xs font-bold text-amber-400">Decision Objectives</p>
            <div className="text-[11px] leading-relaxed space-y-2 text-gray-400">
              <p>
                <strong className="text-amber-300">Current Self:</strong> Ranks Stockfish candidates using your trained neural weights to predict your genuine move choices.
              </p>
              <p>
                <strong className="text-emerald-400">Peak Self:</strong> Preserves your stylistic preferences but penalizes tactical centipawn loss (cp_loss &gt; 30), filtering out blunders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Play;
