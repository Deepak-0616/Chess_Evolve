import { describe, it, expect } from 'vitest';
import { PGNParser } from '../services/chesscom/parser.js';

describe('Data Isolation & User Data Ownership Security', () => {
  it('correctly maps user color and prevents cross-user target confusion', () => {
    const mockGame = {
      url: 'https://chess.com/game/1',
      pgn: '1. e4 e5 2. Nf3 Nc6',
      time_control: '600',
      time_class: 'blitz',
      rated: true,
      end_time: 1700000000,
      white: { username: 'playerA', rating: 1500, result: 'win' },
      black: { username: 'playerB', rating: 1450, result: 'checkmated' },
    };

    const parsedForA = PGNParser.parseGame(mockGame, 'playerA');
    expect(parsedForA?.userColor).toBe('WHITE');
    expect(parsedForA?.result).toBe('WIN');
    expect(parsedForA?.opponentUsername).toBe('playerB');

    const parsedForB = PGNParser.parseGame(mockGame, 'playerB');
    expect(parsedForB?.userColor).toBe('BLACK');
    expect(parsedForB?.result).toBe('LOSS');
    expect(parsedForB?.opponentUsername).toBe('playerA');
  });

  it('rejects parsing when target user is not in the game', () => {
    const mockGame = {
      url: 'https://chess.com/game/1',
      pgn: '1. e4 e5',
      time_control: '600',
      time_class: 'blitz',
      rated: true,
      end_time: 1700000000,
      white: { username: 'playerA', rating: 1500, result: 'win' },
      black: { username: 'playerB', rating: 1450, result: 'checkmated' },
    };

    const parsedForC = PGNParser.parseGame(mockGame, 'playerC');
    expect(parsedForC).toBeNull();
  });
});
