import axios from "axios";

const CHESS_COM_BASE_URL = "https://api.chess.com/pub/player";

export class ChessComClient {
  static userAgent = "ChessEvolveApp/1.0 (contact: support@chessevolve.app)";

  /**
   * Fetches public profile for a Chess.com username.
   */
  static async getProfile(username) {
    const cleanUsername = username.trim().toLowerCase();
    const response = await axios.get(`${CHESS_COM_BASE_URL}/${cleanUsername}`, {
      headers: { "User-Agent": this.userAgent },
    });
    return response.data;
  }

  /**
   * Discovers all available monthly game archives for a player.
   */
  static async getArchives(username) {
    const cleanUsername = username.trim().toLowerCase();
    const response = await axios.get(
      `${CHESS_COM_BASE_URL}/${cleanUsername}/games/archives`,
      { headers: { "User-Agent": this.userAgent } },
    );
    return response.data.archives || [];
  }

  /**
   * Fetches all games in a specific monthly archive URL.
   */
  static async getGamesFromArchive(archiveUrl) {
    const response = await axios.get(archiveUrl, {
      headers: { "User-Agent": this.userAgent },
    });
    return response.data.games || [];
  }
}
