import React, { useState, useEffect } from 'react';
import { Brain, Zap, CheckCircle, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { trainCurrentSelf, trainPeakSelf, getCurrentSelfStatus, getPeakSelfStatus } from '../api';

const ModelCard = ({ title, description, status, accuracy, games, onTrain, training }) => {
  const isReady = status === 'ready';
  const isTrained = status !== 'untrained';

  return (
    <div className="p-6 rounded-2xl transition-all duration-300"
      style={{
        background: 'linear-gradient(145deg, #141414 0%, #111111 100%)',
        border: `1px solid ${isReady ? 'rgba(212,175,55,0.25)' : '#1A1A1A'}`,
        boxShadow: isReady ? '0 0 30px rgba(212,175,55,0.06)' : 'none',
      }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <Brain size={18} style={{ color: '#D4AF37' }} />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: '#F5F0E0' }}>{title}</h3>
            <div className="flex items-center space-x-1.5 mt-0.5">
              {isReady && <CheckCircle size={10} style={{ color: '#4ade80' }} />}
              {status === 'training' && <Loader2 size={10} className="animate-spin" style={{ color: '#D4AF37' }} />}
              {status === 'untrained' && <AlertCircle size={10} style={{ color: '#4A4A4A' }} />}
              <span className="text-xs" style={{
                color: isReady ? '#4ade80' : status === 'training' ? '#D4AF37' : '#4A4A4A'
              }}>
                {isReady ? 'Model Ready' : status === 'training' ? 'Training...' : 'Not Trained'}
              </span>
            </div>
          </div>
        </div>
        {isTrained && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
            {accuracy}% acc
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed mb-4" style={{ color: '#6B6B6B' }}>{description}</p>

      {isTrained && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Games Used', value: games || '248' },
            { label: 'Accuracy', value: `${accuracy}%` },
            { label: 'Status', value: isReady ? 'Ready' : 'Training' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl text-center"
              style={{ background: '#0A0A0A', border: '1px solid #1A1A1A' }}>
              <div className="text-sm font-bold" style={{ color: '#F5F0E0' }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onTrain}
        disabled={training || status === 'training'}
        className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold transition-all"
        style={{
          background: (training || status === 'training')
            ? '#1A1A1A'
            : 'linear-gradient(135deg, #D4AF37, #B8960C)',
          color: (training || status === 'training') ? '#4A4A4A' : '#080808',
          cursor: (training || status === 'training') ? 'not-allowed' : 'pointer',
        }}>
        {(training || status === 'training') ? (
          <><Loader2 size={14} className="animate-spin" /><span>Training in progress...</span></>
        ) : (
          <><Zap size={14} /><span>{isTrained ? 'Retrain Model' : 'Train Model'}</span></>
        )}
      </button>
    </div>
  );
};

const DrillCard = ({ title, desc, difficulty, category }) => {
  const colors = { Easy: '#4ade80', Medium: '#D4AF37', Hard: '#f87171' };
  return (
    <div className="p-4 rounded-xl flex items-center space-x-4 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{ background: '#0A0A0A', border: '1px solid #1A1A1A' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1A1A1A'; }}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(212,175,55,0.08)', fontSize: '18px' }}>
        ♟
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-semibold" style={{ color: '#F5F0E0' }}>{title}</p>
          <span className="text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: `${colors[difficulty]}18`, color: colors[difficulty], border: `1px solid ${colors[difficulty]}30` }}>
            {difficulty}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: '#4A4A4A' }}>{desc}</p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full"
        style={{ background: '#141414', color: '#6B6B6B', border: '1px solid #2A2A2A' }}>{category}</span>
    </div>
  );
};

const DEMO_DRILLS = [
  { title: 'Back Rank Defense', desc: 'Practice defending against back rank mate threats', difficulty: 'Medium', category: 'Tactics' },
  { title: 'Rook Endgame Technique', desc: 'Convert rook and pawn advantages with precision', difficulty: 'Hard', category: 'Endgame' },
  { title: 'Sicilian Structure', desc: 'Master the pawn structures in your favorite opening', difficulty: 'Easy', category: 'Opening' },
  { title: 'Knight Maneuvers', desc: 'Improve your knight coordination and outpost play', difficulty: 'Medium', category: 'Strategy' },
  { title: 'Queen Sacrifice Patterns', desc: 'Recognize when to sacrifice your queen for a decisive attack', difficulty: 'Hard', category: 'Tactics' },
  { title: 'Pawn Break Timing', desc: 'Learn when to create pawn breaks to open the position', difficulty: 'Medium', category: 'Strategy' },
];

const Training = () => {
  const [csStatus, setCsStatus] = useState('untrained');
  const [psStatus, setPsStatus] = useState('untrained');
  const [trainingCs, setTrainingCs] = useState(false);
  const [trainingPs, setTrainingPs] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const [cs, ps] = await Promise.allSettled([getCurrentSelfStatus(), getPeakSelfStatus()]);
        if (cs.status === 'fulfilled') setCsStatus(cs.value.data?.data?.status || 'untrained');
        if (ps.status === 'fulfilled') setPsStatus(ps.value.data?.data?.status || 'untrained');
      } catch {}
    };
    poll();
  }, []);

  const handleTrainCs = async () => {
    setTrainingCs(true);
    setCsStatus('training');
    try {
      await trainCurrentSelf();
      setTimeout(() => { setCsStatus('ready'); setTrainingCs(false); }, 8000);
    } catch { setTrainingCs(false); setCsStatus('untrained'); }
  };

  const handleTrainPs = async () => {
    setTrainingPs(true);
    setPsStatus('training');
    try {
      await trainPeakSelf();
      setTimeout(() => { setPsStatus('ready'); setTrainingPs(false); }, 8000);
    } catch { setTrainingPs(false); setPsStatus('untrained'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display" style={{ color: '#F5F0E0' }}>AI Training Center</h2>
        <p className="text-sm mt-0.5" style={{ color: '#4A4A4A' }}>Train your personalized AI models and improve your game</p>
      </div>

      {/* Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModelCard
          title="Current Self"
          description="A neural model trained on your recent games, capturing your current tactical tendencies, openings, and style. Use it to understand your present form."
          status={csStatus}
          accuracy={87}
          games={248}
          onTrain={handleTrainCs}
          training={trainingCs}
        />
        <ModelCard
          title="Peak Self"
          description="Trained on your highest-rated games and best performances. This model represents the best version of you — challenge it to discover your potential."
          status={psStatus}
          accuracy={91}
          games={62}
          onTrain={handleTrainPs}
          training={trainingPs}
        />
      </div>

      {/* Training drills */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>
            Recommended Drills
          </h3>
          <span className="text-xs" style={{ color: '#3A3A3A' }}>Based on your DNA analysis</span>
        </div>
        <div className="space-y-2">
          {DEMO_DRILLS.map((drill, i) => <DrillCard key={i} {...drill} />)}
        </div>
      </div>

      {/* Progress */}
      <div className="p-5 rounded-2xl" style={{ background: '#0F0F0F', border: '1px solid #1A1A1A' }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: '#F5F0E0' }}>Training Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sessions This Week', value: '12', trend: '+3' },
            { label: 'Puzzles Solved', value: '87', trend: '+12' },
            { label: 'Rating Gain', value: '+34', trend: '▲' },
          ].map(({ label, value, trend }) => (
            <div key={label} className="text-center p-4 rounded-xl" style={{ background: '#0A0A0A', border: '1px solid #1A1A1A' }}>
              <div className="text-2xl font-black font-display" style={{
                background: 'linear-gradient(135deg, #D4AF37, #F0C040)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>{value}</div>
              <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>{label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#4ade80' }}>{trend} this week</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Training;
