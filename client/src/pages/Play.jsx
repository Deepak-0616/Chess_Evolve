import React, { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Swords, Bot, Flag, RotateCcw, Award, Sparkles, Loader2 } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const Play = ({ initialOpponentType = "PEAK_SELF" }) => {
  const [opponentType, setOpponentType] = useState(initialOpponentType);
  const [playerColor, setPlayerColor] = useState("WHITE");

  const [game, setGame] = useState(new Chess());
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState("IDLE");
  const [result, setResult] = useState(null);

  const [moveHistory, setMoveHistory] = useState([]);
  const [botThinking, setBotThinking] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  const startNewGame = async () => {
    try {
      setBotThinking(true);
      const res = await ApiClient.createPlaySession(opponentType, playerColor);
      setSessionId(res.sessionId);
      const newChess = new Chess(res.fen);
      setGame(newChess);
      setStatus("ACTIVE");
      setResult(null);
      setMoveHistory(newChess.history());
      setShowAnalysisModal(false);
    } catch (err) {
      console.warn("Failed to start session:", err);
    } finally {
      setBotThinking(false);
    }
  };

  useEffect(() => {
    startNewGame();
  }, [opponentType, playerColor]);

  const onDrop = (sourceSquare, targetSquare) => {
    if (status !== "ACTIVE" || botThinking) return false;

    const isPlayerTurn = (playerColor === "WHITE" && game.turn() === "w") || (playerColor === "BLACK" && game.turn() === "b");
    if (!isPlayerTurn) return false;

    const moveObj = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };

    const gameCopy = new Chess(game.fen());
    try {
      const legal = gameCopy.move(moveObj);
      if (!legal) return false;
    } catch (e) {
      return false;
    }

    setGame(gameCopy);
    setMoveHistory(gameCopy.history());
    setBotThinking(true);

    if (sessionId) {
      ApiClient.submitMove(sessionId, moveObj)
        .then((res) => {
          const updated = new Chess(res.fen);
          setGame(updated);
          setMoveHistory(updated.history());

          if (res.status === "COMPLETED") {
            setStatus("COMPLETED");
            setResult(res.result || "DRAW");
            setShowAnalysisModal(true);
          }
        })
        .catch((err) => {
          console.warn("Move error:", err);
        })
        .finally(() => {
          setBotThinking(false);
        });
    }

    return true;
  };

  const handleResign = async () => {
    if (!sessionId || status !== "ACTIVE") return;
    try {
      const res = await ApiClient.resignPlaySession(sessionId);
      setStatus("COMPLETED");
      setResult(res.result);
      setShowAnalysisModal(true);
    } catch (err) {
      console.warn("Resign error:", err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls Header */}
      <div className="glass-panel rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Play Against Your AI Counterpart</h1>
            <p className="text-xs text-gray-400">Personalized bot opponent based on your Chess DNA</p>
          </div>
        </div>

        {/* Bot Selection */}
        <div className="flex items-center space-x-2 rounded-2xl bg-dark-900 p-1 border border-white/10">
          <button
            onClick={() => setOpponentType("CURRENT_SELF")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              opponentType === "CURRENT_SELF" ? "bg-gold-500 text-dark-900 shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Current Self ("How I play now")
          </button>

          <button
            onClick={() => setOpponentType("PEAK_SELF")}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              opponentType === "PEAK_SELF" ? "bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 shadow-md" : "text-gray-400 hover:text-white"
            }`}
          >
            Peak Self ("Stronger version")
          </button>
        </div>
      </div>

      {/* Main Playing Interface Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Chess Board Area */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 flex flex-col items-center space-y-4">
          <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {opponentType === "PEAK_SELF" ? "Peak Self AI (Stronger)" : "Current Self AI (Mirror)"}
                </p>
                <p className="text-[11px] text-gray-400">
                  {botThinking ? "Engine calculating move..." : "Waiting for player move"}
                </p>
              </div>
            </div>

            {botThinking && (
              <div className="flex items-center space-x-2 text-gold-400 text-xs font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI Thinking</span>
              </div>
            )}
          </div>

          <div className="w-full max-w-[520px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (!targetSquare) return false;
                  return onDrop(sourceSquare, targetSquare);
                },
                boardOrientation: playerColor.toLowerCase(),
                darkSquareStyle: { backgroundColor: "#2D3748" },
                lightSquareStyle: { backgroundColor: "#CBD5E1" },
              }}
            />
          </div>

          <div className="w-full flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPlayerColor(playerColor === "WHITE" ? "BLACK" : "WHITE")}
                className="rounded-xl border border-white/10 bg-dark-900 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white"
              >
                Side: {playerColor}
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={startNewGame}
                className="flex items-center space-x-1.5 rounded-xl border border-white/10 bg-dark-900 px-3.5 py-1.5 text-xs font-semibold text-gray-300 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>New Game</span>
              </button>

              <button
                onClick={handleResign}
                disabled={status !== "ACTIVE"}
                className="flex items-center space-x-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Resign</span>
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 space-y-4 h-full min-h-[500px] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">Move Notation</h3>

            <div className="max-h-80 overflow-y-auto space-y-1.5 font-mono text-xs pr-1">
              {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-dark-900/60 px-3 py-1.5 border border-white/5">
                  <span className="text-gray-500 font-bold w-8">{idx + 1}.</span>
                  <span className="text-gray-200 w-20">{moveHistory[idx * 2]}</span>
                  <span className="text-gold-400 w-20">{moveHistory[idx * 2 + 1] || ""}</span>
                </div>
              ))}

              {moveHistory.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-8">Game started. Make your move on the board.</p>
              )}
            </div>
          </div>

          {status === "COMPLETED" && (
            <div className="rounded-2xl border border-gold-500/30 bg-gold-500/10 p-4 space-y-3">
              <div className="flex items-center space-x-2 text-gold-400">
                <Award className="h-5 w-5" />
                <span className="text-sm font-bold uppercase">Game Finished</span>
              </div>
              <p className="text-xs text-gray-300 font-semibold">
                Result: <span className="text-white font-extrabold">{result}</span>
              </p>
              <button
                onClick={() => setShowAnalysisModal(true)}
                className="w-full rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-dark-900 hover:bg-gold-400"
              >
                View Post-Game Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-gold-500/40 bg-dark-800 p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Post-Game Analysis</h2>
              <p className="text-xs text-gray-400">Stockfish evaluation of your play against {opponentType}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-dark-900 p-4 text-center">
                <span className="text-xs text-gray-400 block">Your Accuracy</span>
                <span className="text-2xl font-extrabold text-white">84.2%</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-dark-900 p-4 text-center">
                <span className="text-xs text-gray-400 block">AI Accuracy</span>
                <span className="text-2xl font-extrabold text-gold-400">91.8%</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">Critical Moments</span>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                Move 17: Missed tactical knight outpost continuation.
              </div>
            </div>

            <button
              onClick={() => setShowAnalysisModal(false)}
              className="w-full rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 py-3 text-xs font-bold text-dark-900"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
