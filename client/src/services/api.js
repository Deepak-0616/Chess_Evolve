const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api/v1";

export class ApiClient {
  static getToken() {
    return localStorage.getItem("chess_evolve_token");
  }

  static async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const errMessage = json.error?.message || `HTTP Error ${res.status}`;
      const errCode = json.error?.code || "UNKNOWN_ERROR";
      const errorObj = new Error(errMessage);
      errorObj.code = errCode;
      errorObj.details = json.error?.details;
      throw errorObj;
    }

    return json.data;
  }

  // Auth
  static register(data) {
    return this.request("/auth/register", { method: "POST", body: JSON.stringify(data) });
  }

  static login(data) {
    return this.request("/auth/login", { method: "POST", body: JSON.stringify(data) });
  }

  static getMe() {
    return this.request("/auth/me");
  }

  static logout() {
    return this.request("/auth/logout", { method: "POST" });
  }

  // User Profile
  static getUserProfile() {
    return this.request("/profile");
  }

  static updateUserProfile(data) {
    return this.request("/profile", { method: "PATCH", body: JSON.stringify(data) });
  }

  // Profile & Sync
  static connectChessProfile(username) {
    return this.request("/chess/profile/connect", { method: "POST", body: JSON.stringify({ username }) });
  }

  static getChessProfile() {
    return this.request("/chess/profile");
  }

  static startSync(fullSync = false) {
    return this.request("/chess/sync", { method: "POST", body: JSON.stringify({ fullSync }) });
  }

  static getSyncStatus(jobId) {
    return this.request(`/chess/sync/${jobId}`);
  }

  // Games
  static getGames(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/games?${query}`);
  }

  static getGameDetails(gameId) {
    return this.request(`/games/${gameId}`);
  }

  static analyzeGame(gameId) {
    return this.request(`/games/${gameId}/analyze`, { method: "POST" });
  }

  static getGameAnalysis(gameId) {
    return this.request(`/games/${gameId}/analysis`);
  }

  // DNA & Models
  static getCurrentDNA() {
    return this.request("/dna/current");
  }

  static getDNAHistory() {
    return this.request("/dna/history");
  }

  static getModelsSummary() {
    return this.request("/models");
  }

  static trainCurrentSelf() {
    return this.request("/models/current-self/train", { method: "POST" });
  }

  static getCurrentSelfStatus() {
    return this.request("/models/current-self/status");
  }

  static trainPeakSelf() {
    return this.request("/models/peak-self/train", { method: "POST" });
  }

  static getPeakSelfStatus() {
    return this.request("/models/peak-self/status");
  }

  static getModelHistory(modelType) {
    return this.request(`/models/${modelType}/history`);
  }

  // Play
  static createPlaySession(opponentType, color, opponentUserId = null) {
    return this.request("/play/sessions", {
      method: "POST",
      body: JSON.stringify({ opponentType, color, opponentUserId }),
    });
  }

  static getPlaySession(sessionId) {
    return this.request(`/play/sessions/${sessionId}`);
  }

  static submitMove(sessionId, move) {
    return this.request(`/play/sessions/${sessionId}/moves`, { method: "POST", body: JSON.stringify({ move }) });
  }

  static resignPlaySession(sessionId) {
    return this.request(`/play/sessions/${sessionId}/resign`, { method: "POST" });
  }

  static drawPlaySession(sessionId) {
    return this.request(`/play/sessions/${sessionId}/draw`, { method: "POST" });
  }

  // AI Arena
  static getArenaPlayers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/arena/players?${query}`);
  }

  static getArenaPlayerDetails(playerId) {
    return this.request(`/arena/players/${playerId}`);
  }

  static startArenaSession(targetUserId, opponentType, color) {
    return this.request("/arena/sessions", {
      method: "POST",
      body: JSON.stringify({ targetUserId, opponentType, color }),
    });
  }

  // Training
  static getTrainingRecommendations() {
    return this.request("/training/recommendations");
  }

  static startTrainingSession(category, topic, positionCount = 5) {
    return this.request("/training/sessions", { method: "POST", body: JSON.stringify({ category, topic, positionCount }) });
  }

  static getTrainingSession(sessionId) {
    return this.request(`/training/sessions/${sessionId}`);
  }

  static submitTrainingAttempt(sessionId, positionId, move, timeSpentMs = 1000) {
    return this.request(`/training/sessions/${sessionId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ positionId, move, timeSpentMs }),
    });
  }

  // Coach & Dashboard & Evolution
  static askCoach(message, conversationId) {
    return this.request("/coach/chat", { method: "POST", body: JSON.stringify({ message, conversationId }) });
  }

  static getCoachHistory() {
    return this.request("/coach/history");
  }

  static getDashboard() {
    return this.request("/dashboard");
  }

  static getEvolution() {
    return this.request("/evolution");
  }
}
