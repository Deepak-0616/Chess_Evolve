import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Bot, Swords, Play, RefreshCw, Trophy, Flag, AlertCircle } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export const PlayAI = () => {
  const [modelType, setModelType] = useState('CURRENT_SELF');
  const [userColor, setUserColor] = useState('WHITE');
  const [activeSession, setActiveSession] = useState(null);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [gameResult, setGameResult] = useState('');

  const startMatch = async () => {
    setErrorMsg('');
    setGameResult('');
    try {
      const res = await apiClient.post('/play/sessions', {
        opponentModelType: modelType,
        userColor,
      });

      setActiveSession(res.data.session);
      chess.load(res.data.session.fen);
      setFen(res.data.session.fen);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to start match');
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!activeSession || activeSession.status !== 'IN_PROGRESS' || isProcessingMove) return false;

    let moveObj = null;
    try {
      moveObj = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
    } catch (err) {
      return false; // Illegal move
    }

    if (!moveObj) return false;

    setFen(chess.fen());
    setIsProcessingMove(true);

    // Send move to backend
    apiClient.post(`/play/sessions/${activeSession.id}/moves`, {
      move: moveObj.san,
    })
      .then((res) => {
        const updated = res.data.session;
        setActiveSession(updated);
        chess.load(updated.fen);
        setFen(updated.fen);

        if (res.data.isGameOver) {
          setGameResult(`Game Over: ${res.data.status}`);
        }
      })
      .catch((err) => {
        console.error('Move error:', err);
      })
      .finally(() => {
        setIsProcessingMove(false);
      });

    return true;
  };

  const handleResign = async () => {
    if (!activeSession) return;
    try {
      await apiClient.post(`/play/sessions/${activeSession.id}/resign`);
      setGameResult('Game Over: Resigned');
    } catch (err) {}
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center space-x-3">
          <Bot className="w-8 h-8 text-emerald-400" />
          <span>Play Against Your AI Self</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Test your skill against PyTorch models trained on your own historical decision data
        </p>
      </div>

      {!activeSession ? (
        <div className="p-8 rounded-2xl glass-panel max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl font-extrabold text-white text-center">Configure Match</h2>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Select AI Opponent Model
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setModelType('CURRENT_SELF')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    modelType === 'CURRENT_SELF'
                      ? 'bg-emerald-500/20 border-emerald-500 text-white'
                      : 'bg-surface border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="font-extrabold text-sm text-emerald-400">Current Self</div>
                  <div className="text-xs text-slate-400 mt-1">How you actually play right now</div>
                </button>

                <button
                  type="button"
                  onClick={() => setModelType('PEAK_SELF')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    modelType === 'PEAK_SELF'
                      ? 'bg-indigo-500/20 border-indigo-500 text-white'
                      : 'bg-surface border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <div className="font-extrabold text-sm text-indigo-400">Peak Self</div>
                  <div className="text-xs text-slate-400 mt-1">Your style with optimized move quality</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Your Color
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUserColor('WHITE')}
                  className={`py-3 rounded-xl border font-bold text-sm ${
                    userColor === 'WHITE' ? 'bg-white text-slate-950 border-white' : 'bg-surface border-white/10 text-slate-400'
                  }`}
                >
                  Play as White
                </button>
                <button
                  type="button"
                  onClick={() => setUserColor('BLACK')}
                  className={`py-3 rounded-xl border font-bold text-sm ${
                    userColor === 'BLACK' ? 'bg-slate-900 text-white border-slate-700' : 'bg-surface border-white/10 text-slate-400'
                  }`}
                >
                  Play as Black
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={startMatch}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-base shadow-glow transition-all flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Match</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-[500px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <Chessboard
                position={fen}
                onPieceDrop={onDrop}
                boardWidth={500}
                boardOrientation={userColor.toLowerCase()}
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Match Information</h3>
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  vs {modelType}
                </span>
              </div>

              {gameResult && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-bold text-center">
                  {gameResult}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-4 border-t border-white/10">
                <button
                  onClick={handleResign}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center space-x-1"
                >
                  <Flag className="w-4 h-4" />
                  <span>Resign Match</span>
                </button>

                <button
                  onClick={() => setActiveSession(null)}
                  className="px-4 py-2.5 rounded-xl bg-surface hover:bg-white/5 border border-white/10 text-slate-300 font-bold text-xs"
                >
                  New Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
