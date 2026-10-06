import { apiClient } from './client';

// Auth
export const getMe = () => apiClient.get('/auth/me');

// Chess Profile
export const connectChessProfile = (chessUsername) => 
  apiClient.post('/chess/profile/connect', { chessUsername });
export const getChessProfile = () => apiClient.get('/chess/profile');
export const triggerSync = () => apiClient.post('/chess/sync');
export const getSyncStatus = (jobId = 'active') => apiClient.get(`/chess/sync/${jobId}`);

// Games
export const getGames = (params = {}) => apiClient.get('/games', { params });
export const getGame = (gameId) => apiClient.get(`/games/${gameId}`);
export const getGameAnalysis = (gameId) => apiClient.get(`/games/${gameId}/analysis`);

// DNA
export const getDNA = () => apiClient.get('/dna/current');
export const getDNAHistory = () => apiClient.get('/dna/history');

// Models
export const getModels = () => apiClient.get('/models');
export const trainCurrentSelf = () => apiClient.post('/models/current-self/train');
export const trainPeakSelf = () => apiClient.post('/models/peak-self/train');
export const rollbackModel = (data) => apiClient.post('/models/rollback', data);
export const getCurrentSelfStatus = () => apiClient.get('/models/current-self/status');
export const getPeakSelfStatus = () => apiClient.get('/models/peak-self/status');
export const getEvolutionReport = () => apiClient.get('/evolution');
export const getEvolutionOverview = () => apiClient.get('/evolution');
export const getEvolutionTimeline = () => apiClient.get('/evolution/timeline');
export const getEvolutionGameplay = () => apiClient.get('/evolution/gameplay');
export const getEvolutionWeaknesses = () => apiClient.get('/evolution/weaknesses');
export const getModelUpdateStatus = () => apiClient.get('/evolution/model-update-status');
export const generateEvolutionSnapshot = (data) => apiClient.post('/evolution/snapshots/generate', data);
export const getEvolutionSnapshots = () => apiClient.get('/evolution/snapshots');

// Play
export const createPlaySession = (data) => apiClient.post('/play/sessions', data);
export const getPlaySession = (id) => apiClient.get(`/play/sessions/${id}`);
export const makeMove = (id, move) => apiClient.post(`/play/sessions/${id}/moves`, { move });
export const resignSession = (id) => apiClient.post(`/play/sessions/${id}/resign`);

// Training
export const getTrainingRecs = () => apiClient.get('/training/recommendations');
export const getTrainingOverview = () => apiClient.get('/training/overview');
export const getTrainingPlan = () => apiClient.get('/training/plan');
export const getTrainingWeaknesses = () => apiClient.get('/training/weaknesses');
export const getTrainingProgress = () => apiClient.get('/training/progress');
export const createTrainingSession = (data) => apiClient.post('/training/sessions', data);
export const getTrainingSession = (id) => apiClient.get(`/training/sessions/${id}`);
export const getTrainingPosition = (id, index) => apiClient.get(`/training/sessions/${id}/positions/${index}`);
export const submitTrainingAttempt = (id, data) => apiClient.post(`/training/sessions/${id}/attempt`, data);
export const completeTrainingSession = (id) => apiClient.post(`/training/sessions/${id}/complete`);

// Coach
export const sendCoachMessage = (message, conversationId, gameId) => apiClient.post('/coach/chat', { message, conversationId, gameId });
export const getCoachInsights = () => apiClient.get('/coach/insights');
export const getCoachConversations = () => apiClient.get('/coach/conversations');
export const getCoachConversation = (id) => apiClient.get(`/coach/conversations/${id}`);
export const reviewGame = (gameId) => apiClient.post('/coach/game-review', { gameId });

// Arena
export const getArenaPlayers = () => apiClient.get('/arena/players');
export const getArenaPlayer = (id) => apiClient.get(`/arena/players/${id}`);
export const createArenaSession = (data) => apiClient.post('/arena/sessions', data);

// Profile
export const getProfile = () => apiClient.get('/profile');
export const updateProfile = (data) => apiClient.patch('/profile', data);
