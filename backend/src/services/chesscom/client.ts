import axios from 'axios';

export interface ChessComProfile {
  username: string;
  player_id: number;
  url: string;
  name?: string;
  title?: string;
  avatar?: string;
  country?: string;
  followers?: number;
  joined?: number;
  status?: string;
}

export interface ChessComArchivesResponse {
  archives: string[];
}

export interface ChessComGame {
  url: string;
  pgn?: string;
  time_control: string;
  time_class: string;
  rated: boolean;
  end_time: number;
  white: {
    username: string;
    rating: number;
    result: string;
  };
  black: {
    username: string;
    rating: number;
    result: string;
  };
}

export interface ChessComArchiveGamesResponse {
  games: ChessComGame[];
}

const CHESS_COM_BASE_URL = 'https://api.chess.com/pub/player';

export class ChessComClient {
  private static userAgent = 'ChessEvolveApp/1.0 (contact: support@chessevolve.app)';

  /**
   * Fetches public profile for a Chess.com username.
   */
  public static async getProfile(username: string): Promise<ChessComProfile> {
    const cleanUsername = username.trim().toLowerCase();
    const response = await axios.get<ChessComProfile>(`${CHESS_COM_BASE_URL}/${cleanUsername}`, {
      headers: { 'User-Agent': this.userAgent },
    });
    return response.data;
  }

  /**
   * Discovers all available monthly game archives for a player.
   */
  public static async getArchives(username: string): Promise<string[]> {
    const cleanUsername = username.trim().toLowerCase();
    const response = await axios.get<ChessComArchivesResponse>(
      `${CHESS_COM_BASE_URL}/${cleanUsername}/games/archives`,
      { headers: { 'User-Agent': this.userAgent } }
    );
    return response.data.archives || [];
  }

  /**
   * Fetches all games in a specific monthly archive URL.
   */
  public static async getGamesFromArchive(archiveUrl: string): Promise<ChessComGame[]> {
    const response = await axios.get<ChessComArchiveGamesResponse>(archiveUrl, {
      headers: { 'User-Agent': this.userAgent },
    });
    return response.data.games || [];
  }
}
