import React, { useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { Target, CheckCircle2, XCircle, BrainCircuit, ArrowRight } from "lucide-react";
import { ApiClient } from "../services/api.js";

export const Training = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  const [game, setGame] = useState(new Chess());
  const [feedback, setFeedback] = useState(null);
  const [solvedCount, setSolvedCount] = useState(0);

  useEffect(() => {
    ApiClient.getTrainingRecommendations()
      .then((res) => setRecommendations(res))
      .catch((err) => console.warn("Failed to load recommendations:", err));
  }, []);

  const handleStartSession = async (rec) => {
    try {
      const res = await ApiClient.startTrainingSession(rec.category, rec.topic, rec.positionCount);
      setActiveSession(res);
      setCurrentIdx(0);
      setSolvedCount(0);
      setFeedback(null);
      if (res.positions && res.positions.length > 0) {
        setGame(new Chess(res.positions[0].fen));
      }
    } catch (err) {
      console.warn("Failed to start session:", err);
    }
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (!activeSession || feedback) return false;

    const currentPuzzle = activeSession.positions[currentIdx];
    const moveObj = { from: sourceSquare, to: targetSquare };

    ApiClient.submitTrainingAttempt(activeSession.sessionId, currentPuzzle.id, moveObj)
      .then((res) => {
        setFeedback(res);
        if (res.correct) {
          setSolvedCount((prev) => prev + 1);
          const copy = new Chess(game.fen());
          try {
            copy.move({ from: sourceSquare, to: targetSquare });
            setGame(copy);
          } catch (e) {}
        }
      })
      .catch((err) => console.warn("Attempt error:", err));

    return true;
  };

  const handleNextPuzzle = () => {
    if (!activeSession) return;
    const nextIdx = currentIdx + 1;
    if (nextIdx < activeSession.positions.length) {
      setCurrentIdx(nextIdx);
      setFeedback(null);
      setGame(new Chess(activeSession.positions[nextIdx].fen));
    } else {
      setActiveSession(null);
      setFeedback(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center space-x-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-400">
          <Target className="h-3.5 w-3.5" />
          <span>Personalized Weakness Laboratory</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">Targeted Tactical & Strategic Training</h1>
        <p className="text-xs text-gray-300 max-w-2xl">
          Training modules are curated directly from your Chess DNA weaknesses discovered in your real Chess.com games.
        </p>
      </div>

      {!activeSession ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((rec) => (
            <div key={rec.id} className="glass-panel glass-panel-hover rounded-3xl p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">{rec.topic}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{rec.reason}</p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Difficulty: {rec.difficulty}</span>
                  <span>{rec.positionCount} Puzzles</span>
                </div>
                <button
                  onClick={() => handleStartSession(rec)}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-gold-500 py-3 text-xs font-bold text-dark-900 transition-all hover:bg-gold-400"
                >
                  <span>Start Module</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 glass-panel rounded-3xl p-6 flex flex-col items-center space-y-4">
            <div className="w-full flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{activeSession.topic}</h3>
                <p className="text-xs text-gray-400">
                  Puzzle {currentIdx + 1} of {activeSession.positions.length}
                </p>
              </div>
              <div className="text-xs font-bold text-gold-400">Solved: {solvedCount}</div>
            </div>

            <div className="w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <Chessboard
                options={{
                  position: game.fen(),
                  onPieceDrop: ({ sourceSquare, targetSquare }) => {
                    if (!targetSquare) return false;
                    return onDrop(sourceSquare, targetSquare);
                  },
                  darkSquareStyle: { backgroundColor: "#2D3748" },
                  lightSquareStyle: { backgroundColor: "#CBD5E1" },
                }}
              />
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 space-y-6 h-full min-h-[420px] flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">Position Objective</h3>
              <p className="text-xs text-gray-300 font-medium leading-relaxed">
                {activeSession.positions[currentIdx]?.description}
              </p>
            </div>

            {feedback && (
              <div
                className={`rounded-2xl border p-4 space-y-2 ${
                  feedback.correct ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-sm">
                  {feedback.correct ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                  <span>{feedback.correct ? "Correct Move!" : "Incorrect Strategy"}</span>
                </div>
                <p className="text-xs leading-relaxed">{feedback.explanation}</p>
              </div>
            )}

            {feedback && (
              <button
                onClick={handleNextPuzzle}
                className="w-full rounded-xl bg-gold-500 py-3 text-xs font-bold text-dark-900 hover:bg-gold-400"
              >
                {currentIdx + 1 < activeSession.positions.length ? "Next Puzzle →" : "Finish Module"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
