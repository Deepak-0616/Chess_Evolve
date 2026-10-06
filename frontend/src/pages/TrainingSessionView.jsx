import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import {
  Brain,
  Zap,
  Target,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  ArrowLeft,
  Loader2,
  Sparkles,
  Info
} from 'lucide-react';
import { getTrainingSession, submitTrainingAttempt, completeTrainingSession } from '../api';

const LIGHT_SQUARE = '#FFFFFF';
const DARK_SQUARE = '#1C1C1E';
const SELECTED_SQUARE = 'rgba(212,175,55,0.35)';

const QUALITY_COLORS = {
  BEST: '#4ade80',
  EXCELLENT: '#60a5fa',
  GOOD: '#D4AF37',
  INACCURACY: '#facc15',
  MISTAKE: '#fb923c',
  BLUNDER: '#f87171',
};

const TrainingSessionView = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(null);
  const [positions, setPositions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Board state
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [pendingMove, setPendingMove] = useState(null);
  const [attemptResult, setAttemptResult] = useState(null);
  const [error, setError] = useState(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTrainingSession(sessionId);
      setSession(res.data.session);
      const posList = res.data.positions || [];
      setPositions(posList);

      // Find first unattempted position or start at 0
      const firstUnattempted = posList.findIndex((p) => !p.isAttempted);
      const targetIdx = firstUnattempted >= 0 ? firstUnattempted : 0;
      setCurrentIndex(targetIdx);

      if (posList.length > 0) {
        initPosition(posList[targetIdx]);
      }

      if (res.data.session.status === 'COMPLETED') {
        setSessionCompleted(true);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const initPosition = (pos) => {
    if (!pos?.fen) return;
    try {
      const g = new Chess(pos.fen);
      setGame(g);
      setFen(pos.fen);
      setSelectedSquare(null);
      setPendingMove(null);

      // If position was already attempted, restore its attempt result
      if (pos.isAttempted && pos.attempt) {
        setAttemptResult({
          isCorrect: pos.attempt.isCorrect,
          quality: pos.attempt.quality,
          engineRank: pos.attempt.engineRank,
          cpLoss: pos.attempt.cpLoss,
          submittedMove: pos.attempt.submittedMove,
          targetMove: pos.targetMove,
          playerHistoricalMove: pos.playerHistoricalMove,
          playerHistoricalClass: pos.playerHistoricalClass,
          currentSelf: { move: pos.currentSelfMove, confidence: pos.attempt.currentSelfConfidence },
          peakSelf: { move: pos.peakSelfMove, confidence: pos.attempt.peakSelfConfidence },
          explanation: pos.attempt.explanation,
        });
      } else {
        setAttemptResult(null);
      }
    } catch (e) {
      console.error('Failed to parse FEN:', e);
    }
  };

  const handleSelectPosition = (idx) => {
    if (idx < 0 || idx >= positions.length) return;
    setCurrentIndex(idx);
    initPosition(positions[idx]);
  };

  const onDrop = (sourceSquare, targetSquare) => {
    if (attemptResult) return false; // Already submitted

    try {
      // Validate with chess.js locally before staging
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      // Undo local move to keep authoritative FEN until user clicks submit
      game.undo();
      setPendingMove({ from: sourceSquare, to: targetSquare, san: move.san });
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleSubmitMove = async () => {
    if (!pendingMove) return;

    const currentPos = positions[currentIndex];
    if (!currentPos) return;

    try {
      setSubmitting(true);
      setError(null);

      const res = await submitTrainingAttempt(sessionId, {
        positionId: currentPos.id,
        move: pendingMove.san,
        timeSpentMs: 3000,
      });

      const data = res.data;
      setAttemptResult(data);

      // Update position in list to reflect attempted state
      const updatedPositions = [...positions];
      updatedPositions[currentIndex] = {
        ...currentPos,
        isAttempted: true,
        targetMove: data.targetMove,
        attempt: {
          isCorrect: data.isCorrect,
          quality: data.quality,
          engineRank: data.engineRank,
          cpLoss: data.cpLoss,
          submittedMove: data.submittedMove,
        },
      };
      setPositions(updatedPositions);

      if (data.sessionStatus === 'COMPLETED') {
        setSessionCompleted(true);
      }
    } catch (err) {
      console.error('Failed to submit move:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < positions.length) {
      handleSelectPosition(currentIndex + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin mx-auto text-gold-500" style={{ color: '#D4AF37' }} />
          <p className="text-sm text-neutral-400">Loading personalized training session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <AlertCircle size={40} className="mx-auto text-rose-500" />
        <h2 className="text-lg font-bold text-neutral-200">Unable to Load Training Session</h2>
        <p className="text-xs text-neutral-400">{error}</p>
        <button
          onClick={() => navigate('/training')}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 text-neutral-200 hover:bg-neutral-700">
          Back to Training
        </button>
      </div>
    );
  }

  const currentPos = positions[currentIndex];
  const sideToMove = currentPos?.sideToMove === 'WHITE' ? 'White' : 'Black';
  const orientation = (currentPos?.sideToMove || 'white').toLowerCase();

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/training')}
          className="flex items-center space-x-2 text-xs font-semibold text-neutral-400 hover:text-neutral-200">
          <ArrowLeft size={16} />
          <span>Exit Training</span>
        </button>

        <div className="text-center">
          <div className="text-xs font-extrabold uppercase tracking-wider text-gold-500" style={{ color: '#D4AF37' }}>
            {session?.category} DRILL
          </div>
          <h2 className="text-sm font-bold text-neutral-200">{session?.targetWeakness}</h2>
        </div>

        <div className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
          Position {currentIndex + 1} of {positions.length}
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex items-center justify-center space-x-2">
        {positions.map((p, idx) => {
          const isCurrent = idx === currentIndex;
          const isDone = p.isAttempted;
          const isCorrect = p.attempt?.isCorrect;

          return (
            <button
              key={p.id}
              onClick={() => handleSelectPosition(idx)}
              className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all"
              style={{
                background: isCurrent
                  ? '#D4AF37'
                  : isDone
                  ? isCorrect
                    ? 'rgba(74,222,128,0.15)'
                    : 'rgba(248,113,113,0.15)'
                  : '#141414',
                color: isCurrent
                  ? '#080808'
                  : isDone
                  ? isCorrect
                    ? '#4ade80'
                    : '#f87171'
                  : '#666',
                border: isCurrent
                  ? '1px solid #D4AF37'
                  : isDone
                  ? isCorrect
                    ? '1px solid #4ade8040'
                    : '1px solid #f8717140'
                  : '1px solid #222',
              }}>
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Board + Decision Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Chess Board Area (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[500px] rounded-2xl overflow-hidden shadow-2xl p-2.5"
            style={{ background: '#111', border: '1px solid #262626' }}>
            <div className="flex items-center justify-between px-2 py-1.5 mb-2 text-xs font-semibold">
              <span className="flex items-center space-x-1.5 text-neutral-300">
                <span className="w-2.5 h-2.5 rounded-full"
                  style={{ background: sideToMove === 'White' ? '#FFFFFF' : '#333333' }} />
                <span>{sideToMove} to move</span>
              </span>
              <span className="text-neutral-500">Move #{currentPos?.moveNumber || 1}</span>
            </div>

            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={orientation}
              customDarkSquareStyle={{ backgroundColor: DARK_SQUARE }}
              customLightSquareStyle={{ backgroundColor: LIGHT_SQUARE }}
              customSquareStyles={{
                ...(pendingMove?.from ? { [pendingMove.from]: { backgroundColor: SELECTED_SQUARE } } : {}),
                ...(pendingMove?.to ? { [pendingMove.to]: { backgroundColor: SELECTED_SQUARE } } : {}),
              }}
              arePiecesDraggable={!attemptResult}
            />

            <div className="px-2 py-2 mt-2 flex items-center justify-between text-xs text-neutral-400">
              <span>{attemptResult ? 'Position Evaluated' : 'Drag and drop pieces to make your move.'}</span>
              {pendingMove && !attemptResult && (
                <span className="text-gold-500 font-bold" style={{ color: '#D4AF37' }}>
                  Staged: {pendingMove.san}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Feedback / Control Area (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {!attemptResult ? (
            /* Decision Stage */
            <div className="p-6 rounded-3xl space-y-5" style={{ background: '#111', border: '1px solid #222' }}>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold-500" style={{ color: '#D4AF37' }}>
                  Decision Point
                </span>
                <h3 className="text-lg font-bold text-neutral-100">Find the optimal move</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  In your original game, you played <span className="font-bold text-rose-400">{currentPos?.playerHistoricalMove || 'a mistake'}</span> ({currentPos?.playerHistoricalClass || 'BLUNDER'}).
                  Calculate carefully to avoid the recurring habit.
                </p>
              </div>

              {pendingMove ? (
                <div className="p-4 rounded-2xl space-y-3 bg-neutral-950 border border-neutral-800 text-center">
                  <div className="text-xs text-neutral-400">Your Selected Move:</div>
                  <div className="text-2xl font-black text-gold-500" style={{ color: '#D4AF37' }}>
                    {pendingMove.san}
                  </div>
                  <button
                    onClick={handleSubmitMove}
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center space-x-2"
                    style={{
                      background: submitting ? '#333' : 'linear-gradient(135deg, #D4AF37, #B8960C)',
                      color: submitting ? '#888' : '#080808',
                    }}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>Submit Move</span>}
                  </button>
                </div>
              ) : (
                <div className="p-8 rounded-2xl text-center border border-dashed border-neutral-800 text-neutral-500 text-xs">
                  Make your move on the board to test your decision.
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                  {error}
                </div>
              )}
            </div>
          ) : (
            /* Result Feedback Stage */
            <div className="p-6 rounded-3xl space-y-5 animate-in fade-in"
              style={{ background: '#111', border: `1px solid ${QUALITY_COLORS[attemptResult.quality] || '#222'}` }}>
              {/* Result Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {attemptResult.isCorrect ? (
                    <CheckCircle size={20} className="text-emerald-400" />
                  ) : (
                    <XCircle size={20} className="text-rose-400" />
                  )}
                  <span className="text-sm font-extrabold tracking-wide uppercase"
                    style={{ color: QUALITY_COLORS[attemptResult.quality] || '#FFF' }}>
                    {attemptResult.quality}
                  </span>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-neutral-900 border border-neutral-800 text-neutral-300">
                  Engine Rank #{attemptResult.engineRank || 1}
                </span>
              </div>

              {/* Move Comparison Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] mb-0.5">Your Choice</span>
                  <span className="font-extrabold text-neutral-200 text-sm">{attemptResult.submittedMove}</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] mb-0.5">Engine Best</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{attemptResult.targetMove}</span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] mb-0.5">Current Self Model</span>
                  <span className="font-bold text-neutral-300">
                    {attemptResult.currentSelf?.move || 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-900">
                  <span className="text-neutral-500 block text-[10px] mb-0.5">Peak Self Model</span>
                  <span className="font-bold text-gold-500" style={{ color: '#D4AF37' }}>
                    {attemptResult.peakSelf?.move || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Deterministic Explanation */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-xs leading-relaxed space-y-2 text-neutral-300">
                <div className="flex items-center space-x-1.5 text-gold-500 font-bold text-[11px]" style={{ color: '#D4AF37' }}>
                  <Info size={13} />
                  <span>Personalized Analysis</span>
                </div>
                <div className="whitespace-pre-line text-neutral-300">
                  {attemptResult.explanation}
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleNext}
                className="w-full py-3.5 rounded-xl text-xs font-extrabold transition-all shadow-lg flex items-center justify-center space-x-2"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}>
                <span>{currentIndex + 1 < positions.length ? 'Continue to Next Position' : 'Complete Drill Session'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Session Completed Modal / Banner */}
      {sessionCompleted && (
        <div className="p-6 md:p-8 rounded-3xl text-center space-y-4 shadow-2xl"
          style={{ background: 'linear-gradient(145deg, #18150D, #0A0A0A)', border: '1px solid rgba(212,175,55,0.4)' }}>
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
            <Award size={28} style={{ color: '#D4AF37' }} />
          </div>
          <h2 className="text-2xl font-bold" style={{ color: '#F5F0E0' }}>Training Session Complete!</h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            You practiced 5 decision points from your actual games. Your category mastery and difficulty rating have been updated.
          </p>

          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={() => navigate('/training')}
              className="px-6 py-3 rounded-xl text-xs font-bold transition-all bg-neutral-800 text-neutral-200 hover:bg-neutral-700">
              Return to Training
            </button>
            <button
              onClick={() => navigate('/training/progress')}
              className="px-6 py-3 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}>
              View Updated Progress
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingSessionView;
