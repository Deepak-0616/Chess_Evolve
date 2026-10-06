import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Zap,
  Target,
  Shield,
  Activity,
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  BarChart2
} from 'lucide-react';
import { getTrainingOverview, createTrainingSession } from '../api';

const CATEGORY_ICONS = {
  TACTICAL: Target,
  DEFENSIVE: Shield,
  POSITIONAL: Brain,
  ENDGAME: Award,
  OPENING: Zap,
};

const CATEGORY_NAMES = {
  TACTICAL: 'Tactical Calculation',
  DEFENSIVE: 'Defensive King Safety',
  POSITIONAL: 'Positional Mastery',
  ENDGAME: 'Endgame Technique',
  OPENING: 'Opening Precision',
};

const Training = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState('TACTICAL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('INTERMEDIATE');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTrainingOverview();
      setOverview(res.data);
      if (res.data?.activePlan?.focusCategory) {
        setSelectedCategory(res.data.activePlan.focusCategory);
      }
      if (res.data?.progress?.currentDifficulty) {
        setSelectedDifficulty(res.data.progress.currentDifficulty);
      }
    } catch (err) {
      console.error('Failed to load training overview:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (category = selectedCategory, difficulty = selectedDifficulty) => {
    try {
      setCreating(true);
      const res = await createTrainingSession({
        category,
        difficulty,
        targetWeakness: overview?.activePlan?.targetWeakness || undefined,
        planId: overview?.activePlan?.id || undefined,
      });

      if (res.data?.session?.id) {
        navigate(`/training/session/${res.data.session.id}`);
      }
    } catch (err) {
      console.error('Failed to create training session:', err);
      alert(err.response?.data?.details || err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto"
            style={{ borderColor: '#2A2A2A', borderTopColor: '#D4AF37' }} />
          <p className="text-sm font-medium" style={{ color: '#888' }}>
            Analyzing game mistakes & building personalized training...
          </p>
        </div>
      </div>
    );
  }

  // Real Data Empty State Check
  if (!overview?.sufficientData) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="p-8 rounded-3xl text-center space-y-6"
          style={{ background: '#111', border: '1px solid #222' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <AlertTriangle size={28} style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#F5F0E0' }}>
              Personalized Training Needs More Data
            </h2>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: '#888' }}>
              {overview?.message || 'Not enough analyzed games yet to build a personalized training plan.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left p-4 rounded-xl"
            style={{ background: '#0A0A0A', border: '1px solid #1A1A1A' }}>
            <div>
              <div className="text-xs text-neutral-500">Current Analyzed Positions</div>
              <div className="text-lg font-bold" style={{ color: '#F5F0E0' }}>
                {overview?.requirements?.currentPositions || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Required Positions</div>
              <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
                {overview?.requirements?.minimumPositions || 5}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/connect')}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #B8960C)', color: '#080808' }}>
              Sync Chess.com Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { activePlan, weaknesses, strengths, progress, recentSessions, availableModels, user } = overview;
  const CategoryIcon = CATEGORY_ICONS[selectedCategory] || Target;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#D4AF37' }}>
            <Sparkles size={14} />
            <span>AI-Driven Adaptive Drills</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#F5F0E0' }}>
            Personalized Training
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: '#888' }}>
            Targeting real decision errors from {user?.chessUsername || 'your'}'s Chess.com games with Current & Peak Self comparison.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/training/progress')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-neutral-800"
            style={{ background: '#141414', border: '1px solid #2A2A2A', color: '#E0E0E0' }}>
            <BarChart2 size={14} style={{ color: '#D4AF37' }} />
            <span>View Progress</span>
          </button>
        </div>
      </div>

      {/* Hero: Active Plan Drill Banner */}
      <div className="p-6 md:p-8 rounded-3xl relative overflow-hidden transition-all shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #18150D 0%, #0F0F0F 100%)',
          border: '1px solid rgba(212,175,55,0.3)',
          boxShadow: '0 10px 40px rgba(212,175,55,0.06)'
        }}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}>
              <Target size={12} />
              <span>Recommended Training Focus</span>
            </div>
            <h2 className="text-2xl font-bold" style={{ color: '#F5F0E0' }}>
              {activePlan?.targetWeakness || 'Middlegame Tactical Decision Making'}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: '#A0A0A0' }}>
              Generated from recurring blunder patterns in your played games. In this 5-position drill, compare your instinctive choices with Peak Self optimizations.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#111', color: '#888', border: '1px solid #222' }}>
                Difficulty: <strong className="text-neutral-200">{activePlan?.difficulty || 'Intermediate'}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#111', color: '#888', border: '1px solid #222' }}>
                Category: <strong className="text-neutral-200">{CATEGORY_NAMES[activePlan?.focusCategory] || 'Tactical'}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#111', color: '#888', border: '1px solid #222' }}>
                Length: <strong className="text-neutral-200">5 Positions</strong>
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => handleStartSession(activePlan?.focusCategory || 'TACTICAL', activePlan?.difficulty || 'INTERMEDIATE')}
              disabled={creating}
              className="w-full md:w-auto flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl text-sm font-extrabold transition-all shadow-xl hover:scale-105"
              style={{
                background: creating ? '#333' : 'linear-gradient(135deg, #D4AF37, #B8960C)',
                color: creating ? '#888' : '#080808',
                cursor: creating ? 'not-allowed' : 'pointer',
              }}>
              <Play size={18} fill="currentColor" />
              <span>{creating ? 'Building Session...' : 'Start Recommended Drill'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Weakness Summary & Category Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Category Selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold" style={{ color: '#F5F0E0' }}>
              Select Training Focus Area
            </h3>
            <span className="text-xs" style={{ color: '#666' }}>All positions sourced from your actual games</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(CATEGORY_NAMES).map(([key, name]) => {
              const Icon = CATEGORY_ICONS[key] || Target;
              const isSelected = selectedCategory === key;
              const catPerf = progress?.categoryPerformance?.[key];

              return (
                <div
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className="p-4 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between"
                  style={{
                    background: isSelected ? 'rgba(212,175,55,0.06)' : '#111',
                    border: `1px solid ${isSelected ? 'rgba(212,175,55,0.4)' : '#1F1F1F'}`,
                    boxShadow: isSelected ? '0 0 20px rgba(212,175,55,0.05)' : 'none',
                  }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{
                          background: isSelected ? 'rgba(212,175,55,0.2)' : '#1A1A1A',
                          color: isSelected ? '#D4AF37' : '#888',
                        }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: isSelected ? '#F5F0E0' : '#DDD' }}>
                          {name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {catPerf ? `${catPerf.attempted} attempted • ${catPerf.successRate}% solved` : 'Not trained yet'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-900">
                    <span className="text-neutral-500">Curated from personal blunders</span>
                    <span className="font-semibold" style={{ color: isSelected ? '#D4AF37' : '#555' }}>
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Difficulty Selection */}
          <div className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ background: '#111', border: '1px solid #1F1F1F' }}>
            <div className="space-y-0.5">
              <div className="text-xs font-bold" style={{ color: '#F5F0E0' }}>Session Difficulty</div>
              <div className="text-xs text-neutral-500">Current adaptive recommendation: {progress?.currentDifficulty}</div>
            </div>

            <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-neutral-950">
              {['EASY', 'INTERMEDIATE', 'HARD', 'EXPERT'].map((diff) => {
                const isDiff = selectedDifficulty === diff;
                return (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: isDiff ? '#D4AF37' : 'transparent',
                      color: isDiff ? '#080808' : '#777',
                    }}>
                    {diff.charAt(0) + diff.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Weaknesses & Model Comparison */}
        <div className="space-y-6">
          {/* Weaknesses Card */}
          <div className="p-5 rounded-2xl space-y-4" style={{ background: '#111', border: '1px solid #1F1F1F' }}>
            <div className="flex items-center space-x-2 text-xs font-bold" style={{ color: '#D4AF37' }}>
              <TrendingUp size={14} />
              <span>Recurring Chess DNA Weaknesses</span>
            </div>

            <div className="space-y-2">
              {weaknesses.map((w, idx) => (
                <div key={idx} className="p-2.5 rounded-xl flex items-center justify-between text-xs"
                  style={{ background: '#0A0A0A', border: '1px solid #1A1A1A' }}>
                  <span className="font-medium text-neutral-300 truncate max-w-[200px]">{w}</span>
                  <span className="text-neutral-500 text-[10px]">Rank #{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Model Status Card */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: '#111', border: '1px solid #1F1F1F' }}>
            <div className="flex items-center space-x-2 text-xs font-bold" style={{ color: '#D4AF37' }}>
              <Brain size={14} />
              <span>AI Models Engaged</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span className="text-neutral-400">Current Self (v1)</span>
                <span className="text-emerald-400 font-semibold">Ready • Predicts Style</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span className="text-neutral-400">Peak Self (v1)</span>
                <span className="text-emerald-400 font-semibold">Ready • Policy Optimizer</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950">
                <span className="text-neutral-400">Stockfish Engine</span>
                <span className="text-neutral-300 font-semibold">Evaluation Authority</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold" style={{ color: '#F5F0E0' }}>Recent Training Sessions</h3>
            <button
              onClick={() => navigate('/training/progress')}
              className="text-xs font-semibold hover:underline"
              style={{ color: '#D4AF37' }}>
              View Complete History
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/training/session/${s.id}`)}
                className="p-4 rounded-xl cursor-pointer transition-all hover:bg-neutral-900 flex items-center justify-between"
                style={{ background: '#111', border: '1px solid #1F1F1F' }}>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-neutral-200 truncate max-w-[200px]">{s.title}</div>
                  <div className="text-[11px] text-neutral-500">
                    {s.positionsCompleted} / {s.positionsPlanned} positions • {s.status}
                  </div>
                </div>
                {s.score !== null && (
                  <div className="text-right">
                    <span className="text-xs font-extrabold px-2 py-1 rounded-md"
                      style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                      {s.score}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Training;
