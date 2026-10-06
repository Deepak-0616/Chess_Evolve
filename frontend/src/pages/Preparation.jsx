import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { Brain, CheckCircle2, Loader2, Play, Database } from 'lucide-react';
import { RetrainingDashboard } from '../components/RetrainingDashboard';

export const Preparation = () => {
  const [featureJob, setFeatureJob] = useState(null);
  const [datasetJobs, setDatasetJobs] = useState({ CURRENT_SELF: null, PEAK_SELF: null });
  const [modelJob, setModelJob] = useState(null);
  const [peakModelJob, setPeakModelJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkFeatureStatus = async (jobId) => {
    try {
      const res = await apiClient.get(`/ml/features/status/${jobId}`);
      setFeatureJob(res.data.job);
    } catch (err) {
      console.error(err);
    }
  };

  const checkDatasetStatus = async (jobId, type) => {
    try {
      const res = await apiClient.get(`/ml/datasets/status/${jobId}`);
      setDatasetJobs(prev => ({ ...prev, [type]: res.data.job }));
    } catch (err) {
      console.error(err);
    }
  };

  const checkModelStatus = async () => {
    try {
      const res = await apiClient.get('/models');
      if (res.data.currentSelf) {
        setModelJob(res.data.currentSelf);
      }
      if (res.data.peakSelf) {
        setPeakModelJob(res.data.peakSelf);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let interval;
    if (featureJob && (featureJob.status === 'PENDING' || featureJob.status === 'RUNNING')) {
      interval = setInterval(() => checkFeatureStatus(featureJob.id), 2000);
    }
    return () => clearInterval(interval);
  }, [featureJob]);

  useEffect(() => {
    let interval;
    const isRunning = (job) => job && (job.status === 'PENDING' || job.status === 'RUNNING');
    
    if (isRunning(datasetJobs.CURRENT_SELF) || isRunning(datasetJobs.PEAK_SELF)) {
      interval = setInterval(() => {
        if (isRunning(datasetJobs.CURRENT_SELF)) checkDatasetStatus(datasetJobs.CURRENT_SELF.id, 'CURRENT_SELF');
        if (isRunning(datasetJobs.PEAK_SELF)) checkDatasetStatus(datasetJobs.PEAK_SELF.id, 'PEAK_SELF');
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [datasetJobs]);

  useEffect(() => {
    let interval;
    const isRunning = (m) => m && (m.status === 'QUEUED' || m.status === 'TRAINING' || m.status === 'VALIDATING');
    
    // Initial fetch
    checkModelStatus();
    
    if (isRunning(modelJob) || isRunning(peakModelJob)) {
      interval = setInterval(checkModelStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [modelJob?.status, peakModelJob?.status]);

  const triggerExtraction = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/ml/features/generate');
      await checkFeatureStatus(res.data.jobId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start extraction');
    } finally {
      setLoading(false);
    }
  };

  const triggerDatasetGeneration = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/ml/datasets/generate', {
        featureVersion: "v1",
        datasetVersion: "v1",
        generateCurrentSelf: true,
        generatePeakSelf: true
      });
      // Set initial dummy jobs with IDs so the poller picks them up
      const jobs = res.data.jobIds;
      if (jobs.length > 0) checkDatasetStatus(jobs[0], 'CURRENT_SELF');
      if (jobs.length > 1) checkDatasetStatus(jobs[1], 'PEAK_SELF');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start dataset generation');
    } finally {
      setLoading(false);
    }
  };

  const getProgressWidth = (job) => {
    if (!job || !job.totalRecords) return '0%';
    const processed = job.processedRecords || job.gamesProcessed || 0;
    const total = job.totalRecords || job.gamesTotal || 1;
    const pct = Math.round((processed / total) * 100);
    return `${pct}%`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="p-8 rounded-2xl glass-panel space-y-12">
        <div className="flex items-center space-x-4">
          <Brain className="w-10 h-10 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-black text-white">Preparing your AI</h1>
            <p className="text-slate-400 text-sm">Building versioned datasets from historical features</p>
          </div>
        </div>

        {/* Phase 16: Continuous Model Retraining & Activation Pipeline */}
        <RetrainingDashboard />

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* FEATURE EXTRACTION PHASE */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">1</span>
            <span>Feature Extraction</span>
          </h2>
          
          {!featureJob ? (
            <button
              onClick={triggerExtraction}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Extract Features</span>
            </button>
          ) : (
            <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 uppercase font-bold">Status: {featureJob.status}</span>
                <span className="text-emerald-400 font-bold">{getProgressWidth(featureJob)}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: getProgressWidth(featureJob) }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                <div>
                  <p className="text-slate-500">Games</p>
                  <p className="font-bold text-white">{featureJob.gamesProcessed || 0} / {featureJob.gamesTotal || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Positions</p>
                  <p className="font-bold text-emerald-400">{featureJob.positionsProcessed || 0}</p>
                </div>
                <div>
                  <p className="text-slate-500">Candidates</p>
                  <p className="font-bold text-indigo-400">{featureJob.candidateRecordsGenerated || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DATASET GENERATION PHASE */}
        <div className="space-y-4 opacity-50 transition-opacity" style={{ opacity: featureJob?.status === 'COMPLETED' ? 1 : 0.5 }}>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">2</span>
            <span>Dataset Generation</span>
          </h2>

          {featureJob?.status === 'COMPLETED' && !datasetJobs.CURRENT_SELF && !datasetJobs.PEAK_SELF && (
            <button
              onClick={triggerDatasetGeneration}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>Build Current & Peak Datasets</span>
            </button>
          )}

          {datasetJobs.CURRENT_SELF && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 space-y-4">
                <h3 className="font-bold text-indigo-400">Current Self Dataset</h3>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 uppercase">Status: {datasetJobs.CURRENT_SELF.status}</span>
                  <span className="text-indigo-400 font-bold">{getProgressWidth(datasetJobs.CURRENT_SELF)}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: getProgressWidth(datasetJobs.CURRENT_SELF) }} />
                </div>
                <p className="text-xs text-slate-400">Records: {datasetJobs.CURRENT_SELF.processedRecords || 0}</p>
              </div>

              {datasetJobs.PEAK_SELF && (
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 space-y-4">
                  <h3 className="font-bold text-fuchsia-400">Peak Self Dataset</h3>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 uppercase">Status: {datasetJobs.PEAK_SELF.status}</span>
                    <span className="text-fuchsia-400 font-bold">{getProgressWidth(datasetJobs.PEAK_SELF)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div className="h-full bg-fuchsia-500 rounded-full" style={{ width: getProgressWidth(datasetJobs.PEAK_SELF) }} />
                  </div>
                  <p className="text-xs text-slate-400">Records: {datasetJobs.PEAK_SELF.processedRecords || 0}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODEL TRAINING PHASE */}
        {datasetJobs.CURRENT_SELF?.status === 'COMPLETED' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">3</span>
              <span>Model Training & Evaluation</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CURRENT SELF */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                <h3 className="text-xl font-bold text-indigo-400 mb-4">Current Self</h3>
                
                {(!modelJob || modelJob.status === 'NOT_AVAILABLE' || modelJob.status === 'FAILED') ? (
                  <button
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await apiClient.post('/models/current-self/train');
                        checkModelStatus();
                      } catch (e) {
                        setError(e.response?.data?.error || 'Failed to start training');
                      }
                      setLoading(false);
                    }}
                    disabled={loading}
                    className="w-full justify-center py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center space-x-2 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    <span>Train Current Self Model</span>
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 uppercase font-bold">Status</span>
                      <span className="text-indigo-400 font-bold">{modelJob.status}</span>
                    </div>
                    
                    {modelJob.evaluationMetrics && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-slate-900 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">Top-1 Accuracy</p>
                          <p className="font-bold text-emerald-400">{(modelJob.evaluationMetrics.top1 * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">Top-3 Accuracy</p>
                          <p className="font-bold text-emerald-400">{(modelJob.evaluationMetrics.top3 * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-lg">
                          <p className="text-xs text-slate-500">MRR</p>
                          <p className="font-bold text-white">{modelJob.evaluationMetrics.mrr?.toFixed(3)}</p>
                        </div>
                      </div>
                    )}
                    
                    {modelJob.behavioralMetrics && (
                      <div className="mt-4 border-t border-slate-700 pt-4">
                        <p className="text-xs text-slate-500 mb-2">Behavioral Similarity</p>
                        <div className="bg-slate-900 p-3 rounded-lg flex space-x-6 text-sm">
                          <div>
                            <span className="text-slate-400">Engine JS Div: </span>
                            <span className="font-bold text-white">{modelJob.behavioralMetrics.engineRankDistance?.toFixed(3) || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Move Type JS Div: </span>
                            <span className="font-bold text-white">{modelJob.behavioralMetrics.moveTypeDistance?.toFixed(3) || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {modelJob.status === 'READY' && (
                      <div className="mt-6 pt-4 border-t border-slate-700">
                        <a
                          href="/play?opponent=current-self"
                          className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                          ⚔️ Play Against Current Self
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PEAK SELF */}
              {datasetJobs.PEAK_SELF?.status === 'COMPLETED' && (
                <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                  <h3 className="text-xl font-bold text-fuchsia-400 mb-4">Peak Self</h3>
                  
                  {(!peakModelJob || peakModelJob.status === 'NOT_AVAILABLE' || peakModelJob.status === 'FAILED') ? (
                    <button
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await apiClient.post('/models/peak-self/train');
                          checkModelStatus();
                        } catch (e) {
                          setError(e.response?.data?.error || 'Failed to start Peak Self training');
                        }
                        setLoading(false);
                      }}
                      disabled={loading || (modelJob?.status !== 'READY')}
                      className="w-full justify-center py-3 px-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title={modelJob?.status !== 'READY' ? 'Current Self must be READY first' : ''}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                      <span>Train Peak Self Model</span>
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 uppercase font-bold">Status</span>
                        <span className="text-fuchsia-400 font-bold">{peakModelJob.status}</span>
                      </div>
                      
                      {peakModelJob.evaluationMetrics && (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="bg-slate-900 p-3 rounded-lg">
                            <p className="text-xs text-slate-500">Target Top-1</p>
                            <p className="font-bold text-emerald-400">{(peakModelJob.evaluationMetrics.top1 * 100).toFixed(1)}%</p>
                          </div>
                          <div className="bg-slate-900 p-3 rounded-lg">
                            <p className="text-xs text-slate-500">Validation Loss</p>
                            <p className="font-bold text-white">{peakModelJob.evaluationMetrics.valLoss?.toFixed(4)}</p>
                          </div>
                        </div>
                      )}
                      
                      {peakModelJob.eval_report?.metrics && (
                        <div className="mt-4 border-t border-slate-700 pt-4">
                          <p className="text-xs text-slate-500 mb-2">Quality & Identity</p>
                          <div className="bg-slate-900 p-3 rounded-lg grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400 block text-xs">Engine JS Div</span>
                              <span className="font-bold text-white">{peakModelJob.eval_report.metrics.engineRankDistance?.toFixed(3) || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-xs">Weakness Redux</span>
                              <span className="font-bold text-emerald-400">{(peakModelJob.eval_report.metrics.weaknessReductionRate * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {peakModelJob.qualityGateResult?.reasons && (
                        <div className="mt-4 text-xs text-slate-400 bg-slate-900 p-3 rounded-lg">
                          <p className="font-bold mb-1">Gate Notes:</p>
                          <ul className="list-disc pl-4 space-y-1">
                            {peakModelJob.qualityGateResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      {peakModelJob.status === 'READY' && (
                        <div className="mt-6 pt-4 border-t border-slate-700">
                          <a
                            href="/play?opponent=peak-self"
                            className="w-full inline-flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 transition-colors"
                          >
                            ⚔️ Play Against Peak Self
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
