const CHESS_COM_BASE = "https://api.chess.com/pub";
const USER_AGENT = "ChessEvolve-App/1.0 (contact@chessevolve.app)";

export class ChessComClient {
  static async fetchJson(url) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      throw new Error("NOT_FOUND");
    }

    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return await response.json();
  }

  static async getPlayerProfile(username) {
    const cleanUsername = username.trim().toLowerCase();
    const url = `${CHESS_COM_BASE}/player/${encodeURIComponent(cleanUsername)}`;
    return this.fetchJson(url);
  }

  static async getPlayerStats(username) {
    const cleanUsername = username.trim().toLowerCase();
    const url = `${CHESS_COM_BASE}/player/${encodeURIComponent(cleanUsername)}/stats`;
    try {
      return await this.fetchJson(url);
    } catch (e) {
      return null;
    }
  }

  static async getGameArchives(username) {
    const cleanUsername = username.trim().toLowerCase();
    const url = `${CHESS_COM_BASE}/player/${encodeURIComponent(cleanUsername)}/games/archives`;
    const res = await this.fetchJson(url);
    return res.archives || [];
  }

  static async getGamesFromArchive(archiveUrl) {
    const res = await this.fetchJson(archiveUrl);
    return res.games || [];
  }
}
