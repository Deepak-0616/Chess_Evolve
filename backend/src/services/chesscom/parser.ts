import { Chess } from 'chess.js';
import { ChessComGame } from './client.js';
import crypto from 'crypto';

export interface ParsedMove {
  moveNumber: number;
  ply: number;
  fenBefore: string;
  fenAfter: string;
  san: string;
  isPlayerMove: boolean;
}

export interface ParsedGameData {
  externalId: string;
  url?: string;
  pgn: string;
  timeControl: string;
  timeClass: string;
  rated: boolean;
  whiteUsername: string;
  whiteRating: number;
  blackUsername: string;
  blackRating: number;
  userColor: 'WHITE' | 'BLACK';
  userRating: number;
  opponentUsername: string;
  opponentRating: number;
  result: 'WIN' | 'LOSS' | 'DRAW';
  endReason: string;
  playedAt: Date;
  moves: ParsedMove[];
}

export class PGNParser {
  /**
   * Generates a deterministic game hash ID from PGN and metadata to ensure idempotency.
   */
  public static generateGameId(pgn: string, white: string, black: string, playedAtMs: number): string {
    const hash = crypto.createHash('sha256');
    hash.update(`${white.toLowerCase()}_${black.toLowerCase()}_${playedAtMs}_${pgn.slice(0, 100)}`);
    return `game_${hash.digest('hex').slice(0, 24)}`;
  }

  /**
   * Parses a raw ChessComGame object for a connected player username.
   */
  public static parseGame(game: ChessComGame, targetUsername: string): ParsedGameData | null {
    if (!game.pgn) return null;

    const lowerTarget = targetUsername.trim().toLowerCase();
    const isWhite = game.white.username.toLowerCase() === lowerTarget;
    const isBlack = game.black.username.toLowerCase() === lowerTarget;

    if (!isWhite && !isBlack) return null; // Player not in game

    const userColor: 'WHITE' | 'BLACK' = isWhite ? 'WHITE' : 'BLACK';
    const userRating = isWhite ? game.white.rating : game.black.rating;
    const opponentUsername = isWhite ? game.black.username : game.white.username;
    const opponentRating = isWhite ? game.black.rating : game.white.rating;

    // Result calculation
    const userResultStr = isWhite ? game.white.result : game.black.result;
    let result: 'WIN' | 'LOSS' | 'DRAW' = 'DRAW';
    if (userResultStr === 'win') {
      result = 'WIN';
    } else if (['checkmated', 'timeout', 'resigned', 'abandoned', 'lose'].includes(userResultStr)) {
      result = 'LOSS';
    }

    const playedAt = new Date(game.end_time * 1000);
    const externalId = this.generateGameId(game.pgn, game.white.username, game.black.username, game.end_time);

    // Reconstruct moves using chess.js
    const chess = new Chess();
    const moves: ParsedMove[] = [];

    try {
      chess.loadPgn(game.pgn);
      const history = chess.history({ verbose: true });

      const replayChess = new Chess();
      let ply = 0;

      for (const move of history) {
        ply++;
        const fenBefore = replayChess.fen();
        const moveNumber = Math.ceil(ply / 2);
        const isPlayerMove = (ply % 2 === 1 && userColor === 'WHITE') || (ply % 2 === 0 && userColor === 'BLACK');

        replayChess.move(move);
        const fenAfter = replayChess.fen();

        moves.push({
          moveNumber,
          ply,
          fenBefore,
          fenAfter,
          san: move.san,
          isPlayerMove,
        });
      }
    } catch (err) {
      console.warn('Chess.js PGN parse warning for game:', externalId, err);
      // Return basic metadata even if full move replay had non-standard PGN annotations
    }

    return {
      externalId,
      url: game.url,
      pgn: game.pgn,
      timeControl: game.time_control || '600',
      timeClass: game.time_class || 'blitz',
      rated: game.rated ?? true,
      whiteUsername: game.white.username,
      whiteRating: game.white.rating || 1200,
      blackUsername: game.black.username,
      blackRating: game.black.rating || 1200,
      userColor,
      userRating: userRating || 1200,
      opponentUsername,
      opponentRating: opponentRating || 1200,
      result,
      endReason: userResultStr,
      playedAt,
      moves,
    };
  }
}
