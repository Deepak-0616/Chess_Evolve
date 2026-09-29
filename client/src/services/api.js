const API_BASE = "http://localhost:5000/api/v1";

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

  // DNA & Peak Self
  static getCurrentDNA() {
    return this.request("/dna/current");
  }

  static getDNAHistory() {
    return this.request("/dna/history");
  }

  static getPeakSelf() {
    return this.request("/peak-self");
  }

  static generatePeakSelf() {
    return this.request("/peak-self/generate", { method: "POST" });
  }

  // Play
  static createPlaySession(opponentType, color) {
    return this.request("/play/sessions", { method: "POST", body: JSON.stringify({ opponentType, color }) });
  }

  static submitMove(sessionId, move) {
    return this.request(`/play/sessions/${sessionId}/moves`, { method: "POST", body: JSON.stringify({ move }) });
  }

  static resignPlaySession(sessionId) {
    return this.request(`/play/sessions/${sessionId}/resign`, { method: "POST" });
  }

  // Training
  static getTrainingRecommendations() {
    return this.request("/training/recommendations");
  }

  static startTrainingSession(category, topic, positionCount = 5) {
    return this.request("/training/sessions", { method: "POST", body: JSON.stringify({ category, topic, positionCount }) });
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

  static getDashboard() {
    return this.request("/dashboard");
  }

  static getEvolution() {
    return this.request("/evolution");
  }
}
