import axios from "axios";

export class ChessComClient {
  static userAgent = "ChessEvolveApp/1.0 (contact: support@chessevolve.app)";
  static timeoutMs = 15000;

  static getBaseUrl() {
    const raw = process.env.CHESS_API_BASE_URL || "https://api.chess.com/pub";
    return raw.replace(/\/player\/?$/, ""); // Normalize base url to root pub endpoint
  }

  /**
   * Helper that executes HTTP requests with retries, exponential backoff, and 429 handling.
   */
  static async _requestWithRetry(url, options = {}, retries = 3) {
    let attempt = 0;
    let delay = 1000;

    while (attempt <= retries) {
      try {
        const response = await axios.get(url, {
          headers: { "User-Agent": this.userAgent, ...(options.headers || {}) },
          timeout: this.timeoutMs,
          ...options,
        });
        return response.data;
      } catch (err) {
        attempt++;
        const status = err.response?.status;

        // 404 means user definitely not found — do not retry
        if (status === 404) {
          throw new Error(`Chess.com resource not found: ${url}`);
        }

        // 429 Rate Limit
        if (status === 429) {
          const retryAfterSec = parseInt(err.response?.headers?.["retry-after"] || "2", 10);
          delay = Math.max(retryAfterSec * 1000, delay * 2);
          console.warn(`[ChessComClient] Rate limited (429). Retrying in ${delay}ms...`);
        } else if (status >= 500) {
          // Upstream Chess.com server error
          delay = delay * 2;
          console.warn(`[ChessComClient] Upstream server error (${status}). Retrying in ${delay}ms...`);
        } else if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
          console.warn(`[ChessComClient] Network timeout. Retrying in ${delay}ms...`);
        } else {
          // Other client error
          throw err;
        }

        if (attempt > retries) {
          throw new Error(`Chess.com request failed after ${retries} attempts: ${err.message}`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  static _statsCache = new Map();
  static _profileCache = new Map();

  /**
   * Fetches public profile for a Chess.com username (cached for 5 minutes).
   */
  static async getProfile(username, forceRefresh = false) {
    if (!username || typeof username !== "string") {
      throw new Error("Invalid username provided");
    }
    const cleanUsername = username.trim().toLowerCase();
    if (!forceRefresh) {
      const cached = this._profileCache.get(cleanUsername);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }
    const url = `${this.getBaseUrl()}/player/${encodeURIComponent(cleanUsername)}`;
    const data = await this._requestWithRetry(url);
    if (data) {
      this._profileCache.set(cleanUsername, {
        data,
        expiresAt: Date.now() + 300000, // 5 minutes
      });
    }
    return data;
  }

  /**
   * Discovers all available monthly game archives for a player.
   */
  static async getArchives(username) {
    if (!username || typeof username !== "string") return [];
    const cleanUsername = username.trim().toLowerCase();
    const url = `${this.getBaseUrl()}/player/${encodeURIComponent(cleanUsername)}/games/archives`;
    const data = await this._requestWithRetry(url);
    return data?.archives || [];
  }

  /**
   * Fetches all games in a specific monthly archive URL.
   */
  static async getGamesFromArchive(archiveUrl) {
    if (!archiveUrl) return [];
    const data = await this._requestWithRetry(archiveUrl);
    return data?.games || [];
  }

  /**
   * Fetches current player statistics (cached for 2 minutes).
   */
  static async getStats(username, forceRefresh = false) {
    if (!username) return null;
    const cleanUsername = username.trim().toLowerCase();
    if (!forceRefresh) {
      const cached = this._statsCache.get(cleanUsername);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }
    const url = `${this.getBaseUrl()}/player/${encodeURIComponent(cleanUsername)}/stats`;
    try {
      const data = await this._requestWithRetry(url, {}, 2);
      if (data) {
        this._statsCache.set(cleanUsername, {
          data,
          expiresAt: Date.now() + 120000, // 2 minutes
        });
      }
      return data;
    } catch {
      return null;
    }
  }

  static invalidateCache(username) {
    if (username) {
      const clean = username.trim().toLowerCase();
      this._statsCache.delete(clean);
      this._profileCache.delete(clean);
    }
  }
}
