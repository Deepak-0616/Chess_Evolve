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
            style={{ borderColor: '#181A24', borderTopColor: '#C5A059' }} />
          <p className="text-sm font-medium tracking-wide" style={{ color: '#7E8092' }}>
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
        <div className="p-8 rounded-3xl text-center space-y-6 shadow-2xl"
          style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-sm"
            style={{ background: 'rgba(197,160,89,0.12)', border: '1px solid rgba(197,160,89,0.25)' }}>
            <AlertTriangle size={28} style={{ color: '#D4B46A' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2" style={{ color: '#F3EFE6' }}>
              Personalized Training Needs More Data
            </h2>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: '#7E8092' }}>
              {overview?.message || 'Not enough analyzed games yet to build a personalized training plan.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left p-4 rounded-xl"
            style={{ background: '#0E1017', border: '1px solid #181A24' }}>
            <div>
              <div className="text-xs text-[#7E8092]">Current Analyzed Positions</div>
              <div className="text-lg font-bold" style={{ color: '#F3EFE6' }}>
                {overview?.requirements?.currentPositions || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#7E8092]">Required Positions</div>
              <div className="text-lg font-bold" style={{ color: '#D4B46A' }}>
                {overview?.requirements?.minimumPositions || 5}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/connect')}
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)', color: '#040406' }}>
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
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#D4B46A' }}>
            <Sparkles size={14} />
            <span>AI-Driven Adaptive Drills</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display" style={{ color: '#F3EFE6' }}>
            Personalized Training
          </h1>
          <p className="text-xs md:text-sm mt-1" style={{ color: '#7E8092' }}>
            Targeting real decision errors from {user?.chessUsername || 'your'}'s Chess.com games with Current & Peak Self comparison.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/training/progress')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-[#181A26] shadow-sm"
            style={{ background: '#0E1017', border: '1px solid #181A24', color: '#E4E2DC' }}>
            <BarChart2 size={14} style={{ color: '#D4B46A' }} />
            <span>View Progress</span>
          </button>
        </div>
      </div>

      {/* Hero: Active Plan Drill Banner */}
      <div className="p-6 md:p-8 rounded-3xl relative overflow-hidden transition-all shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #10121A 0%, #08090E 100%)',
          border: '1px solid rgba(197, 160, 89, 0.28)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 30px rgba(197,160,89,0.06)'
        }}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(197,160,89,0.14)', color: '#D4B46A', border: '1px solid rgba(197,160,89,0.3)' }}>
              <Target size={12} />
              <span>Recommended Training Focus</span>
            </div>
            <h2 className="text-2xl font-bold font-display" style={{ color: '#F3EFE6' }}>
              {activePlan?.targetWeakness || 'Middlegame Tactical Decision Making'}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed" style={{ color: '#8A8D9F' }}>
              Generated from recurring blunder patterns in your played games. In this 5-position drill, compare your instinctive choices with Peak Self optimizations.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#0E1017', color: '#8A8D9F', border: '1px solid #181A24' }}>
                Difficulty: <strong className="text-[#F3EFE6]">{activePlan?.difficulty || 'Intermediate'}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#0E1017', color: '#8A8D9F', border: '1px solid #181A24' }}>
                Category: <strong className="text-[#F3EFE6]">{CATEGORY_NAMES[activePlan?.focusCategory] || 'Tactical'}</strong>
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-medium" style={{ background: '#0E1017', color: '#8A8D9F', border: '1px solid #181A24' }}>
                Length: <strong className="text-[#F3EFE6]">5 Positions</strong>
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => handleStartSession(activePlan?.focusCategory || 'TACTICAL', activePlan?.difficulty || 'INTERMEDIATE')}
              disabled={creating}
              className="w-full md:w-auto flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl text-sm font-extrabold transition-all shadow-xl hover:scale-105"
              style={{
                background: creating ? '#141620' : 'linear-gradient(135deg, #B58D3D 0%, #D4B46A 45%, #926E28 100%)',
                color: creating ? '#555869' : '#040406',
                cursor: creating ? 'not-allowed' : 'pointer',
                boxShadow: creating ? 'none' : '0 4px 20px rgba(181, 141, 61, 0.28)',
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
            <h3 className="text-base font-bold font-display" style={{ color: '#F3EFE6' }}>
              Select Training Focus Area
            </h3>
            <span className="text-xs" style={{ color: '#7E8092' }}>All positions sourced from your actual games</span>
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
                    background: isSelected ? 'rgba(197,160,89,0.08)' : '#0B0C12',
                    border: `1px solid ${isSelected ? 'rgba(197,160,89,0.45)' : '#181A24'}`,
                    boxShadow: isSelected ? '0 0 25px rgba(197,160,89,0.1)' : 'none',
                  }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                        style={{
                          background: isSelected ? 'rgba(197,160,89,0.2)' : '#141622',
                          color: isSelected ? '#D4B46A' : '#7E8092',
                        }}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: isSelected ? '#F3EFE6' : '#D5D7E2' }}>
                          {name}
                        </div>
                        <div className="text-xs text-[#7E8092]">
                          {catPerf ? `${catPerf.attempted} attempted • ${catPerf.successRate}% solved` : 'Not trained yet'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#181A24]">
                    <span className="text-[#7E8092]">Curated from personal blunders</span>
                    <span className="font-semibold" style={{ color: isSelected ? '#D4B46A' : '#5A5D70' }}>
                      {isSelected ? 'Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Difficulty Selection */}
          <div className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
            <div className="space-y-0.5">
              <div className="text-xs font-bold" style={{ color: '#F3EFE6' }}>Session Difficulty</div>
              <div className="text-xs text-[#7E8092]">Current adaptive recommendation: {progress?.currentDifficulty}</div>
            </div>

            <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#08090D] border border-[#181A24]">
              {['EASY', 'INTERMEDIATE', 'HARD', 'EXPERT'].map((diff) => {
                const isDiff = selectedDifficulty === diff;
                return (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: isDiff ? 'linear-gradient(135deg, #B58D3D, #D4B46A)' : 'transparent',
                      color: isDiff ? '#040406' : '#7E8092',
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
          <div className="p-5 rounded-2xl space-y-4" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center space-x-2 text-xs font-bold" style={{ color: '#D4B46A' }}>
              <TrendingUp size={14} />
              <span>Recurring Chess DNA Weaknesses</span>
            </div>

            <div className="space-y-2">
              {weaknesses.map((w, idx) => (
                <div key={idx} className="p-2.5 rounded-xl flex items-center justify-between text-xs"
                  style={{ background: '#0E1017', border: '1px solid #181A24' }}>
                  <span className="font-medium text-[#D5D7E2] truncate max-w-[200px]">{w}</span>
                  <span className="text-[#7E8092] text-[10px]">Rank #{idx + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Model Status Card */}
          <div className="p-5 rounded-2xl space-y-3" style={{ background: '#0B0C12', border: '1px solid #181A24', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            <div className="flex items-center space-x-2 text-xs font-bold" style={{ color: '#D4B46A' }}>
              <Brain size={14} />
              <span>AI Models Engaged</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1017] border border-[#181A24]">
                <span className="text-[#8A8D9F]">Current Self (v1)</span>
                <span className="text-emerald-400 font-semibold">Ready • Predicts Style</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1017] border border-[#181A24]">
                <span className="text-[#8A8D9F]">Peak Self (v1)</span>
                <span className="text-emerald-400 font-semibold">Ready • Policy Optimizer</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1017] border border-[#181A24]">
                <span className="text-[#8A8D9F]">Stockfish Engine</span>
                <span className="text-[#D5D7E2] font-semibold">Evaluation Authority</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-display" style={{ color: '#F3EFE6' }}>Recent Training Sessions</h3>
            <button
              onClick={() => navigate('/training/progress')}
              className="text-xs font-semibold hover:underline"
              style={{ color: '#D4B46A' }}>
              View Complete History
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/training/session/${s.id}`)}
                className="p-4 rounded-xl cursor-pointer transition-all hover:bg-[#141622] flex items-center justify-between"
                style={{ background: '#0B0C12', border: '1px solid #181A24' }}>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#F3EFE6] truncate max-w-[200px]">{s.title}</div>
                  <div className="text-[11px] text-[#7E8092]">
                    {s.positionsCompleted} / {s.positionsPlanned} positions • {s.status}
                  </div>
                </div>
                {s.score !== null && (
                  <div className="text-right">
                    <span className="text-xs font-extrabold px-2 py-1 rounded-md"
                      style={{ background: 'rgba(197,160,89,0.14)', color: '#D4B46A', border: '1px solid rgba(197,160,89,0.25)' }}>
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
