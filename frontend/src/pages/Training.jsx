import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { GraduationCap, Target, Play, CheckCircle2, Loader2 } from 'lucide-react';
import { Chessboard } from 'react-chessboard';

export const Training = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecs() {
      try {
        const res = await apiClient.get('/training/recommendations');
        setRecommendations(res.data.recommendations || []);
      } catch (err) {
        console.error('Error fetching training recommendations:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecs();
  }, []);

  const startDrill = async (weakness) => {
    try {
      const res = await apiClient.post('/training/sessions', { targetWeakness: weakness });
      setActiveSession(res.data.session);
    } catch (err) {
      console.error('Failed to start training drill:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center space-x-3">
          <GraduationCap className="w-8 h-8 text-emerald-400" />
          <span>Personalized Weakness Training</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Interactive drills targeting positions where Stockfish identified recurring mistakes in your history
        </p>
      </div>

      {!activeSession ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec) => (
            <div key={rec.id} className="p-6 rounded-2xl glass-card space-y-4 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                  {rec.targetWeakness}
                </span>
                <span className="text-xs text-slate-500 font-semibold">{rec.estimatedMinutes} Mins</span>
              </div>
              <h3 className="text-lg font-bold text-white">{rec.title}</h3>
              <p className="text-xs text-slate-400">{rec.description}</p>
              <button
                onClick={() => startDrill(rec.targetWeakness)}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-glow transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Training Session</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl glass-panel space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">{activeSession.title}</h2>
            <button
              onClick={() => setActiveSession(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Exit Drill
            </button>
          </div>

          {activeSession.positions?.[0] && (
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-full max-w-[420px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <Chessboard position={activeSession.positions[0].fen} boardWidth={420} />
              </div>
              <div className="p-4 rounded-xl bg-surface border border-white/10 w-full max-w-[420px] text-center space-y-2">
                <p className="text-sm text-slate-200 font-semibold">{activeSession.positions[0].prompt}</p>
                <p className="text-xs text-emerald-400 font-bold">Recommended Move: {activeSession.positions[0].bestMove}</p>
                <p className="text-xs text-slate-400">{activeSession.positions[0].explanation}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
