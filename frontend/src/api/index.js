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
export const getCurrentSelfStatus = () => apiClient.get('/models/current-self/status');
export const getPeakSelfStatus = () => apiClient.get('/models/peak-self/status');

// Play
export const createPlaySession = (data) => apiClient.post('/play/sessions', data);
export const getPlaySession = (id) => apiClient.get(`/play/sessions/${id}`);
export const makeMove = (id, move) => apiClient.post(`/play/sessions/${id}/moves`, { move });
export const resignSession = (id) => apiClient.post(`/play/sessions/${id}/resign`);

// Training
export const getTrainingRecs = () => apiClient.get('/training/recommendations');
export const createTrainingSession = (data) => apiClient.post('/training/sessions', data);

// Coach
export const sendCoachMessage = (message) => apiClient.post('/coach/chat', { message });

// Arena
export const getArenaPlayers = () => apiClient.get('/arena/players');
export const getArenaPlayer = (id) => apiClient.get(`/arena/players/${id}`);
export const createArenaSession = (data) => apiClient.post('/arena/sessions', data);

// Profile
export const getProfile = () => apiClient.get('/profile');
export const updateProfile = (data) => apiClient.patch('/profile', data);
