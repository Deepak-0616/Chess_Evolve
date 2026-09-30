import { Chess } from "chess.js";
import { PrismaClient } from "@prisma/client";
import { ChessEngineService } from "../chess-engine/service.js";
import { ChessDNAService } from "../dna/service.js";
import { PeakSelfService } from "../peak-self/service.js";

const prisma = new PrismaClient();

export class PlayService {
  static async createSession(userId, opponentType, color) {
    const chess = new Chess();
    let initialFen = chess.fen();
    let initialPgn = "";

    const session = await prisma.playSession.create({
      data: {
        userId,
        opponentType,
        color,
        status: "ACTIVE",
        fen: initialFen,
        pgn: initialPgn,
      },
    });

    let botMove = null;

    if (color === "BLACK") {
      const firstBotMove = await this.getBotMove(chess, opponentType, userId);
      if (firstBotMove) {
        chess.move(firstBotMove);
        botMove = {
          san: firstBotMove.san,
          uci: `${firstBotMove.from}${firstBotMove.to}${firstBotMove.promotion || ""}`,
        };
        await prisma.playSession.update({
          where: { id: session.id },
          data: {
            fen: chess.fen(),
            pgn: chess.pgn(),
          },
        });
      }
    }

    return {
      sessionId: session.id,
      opponentType: session.opponentType,
      color: session.color,
      fen: chess.fen(),
      status: session.status,
      botMove,
    };
  }

  static async submitMove(userId, sessionId, move) {
    const session = await prisma.playSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new Error("SESSION_NOT_FOUND");
    }

    if (session.status !== "ACTIVE") {
      throw new Error("SESSION_INACTIVE");
    }

    const chess = new Chess(session.fen);

    let playerMoveObj;
    try {
      playerMoveObj = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q",
      });
    } catch (e) {
      throw new Error("INVALID_MOVE");
    }

    let status = "ACTIVE";
    let result;

    if (chess.isGameOver()) {
      status = "COMPLETED";
      if (chess.isCheckmate()) {
        result = "WIN";
      } else {
        result = "DRAW";
      }

      await prisma.playSession.update({
        where: { id: session.id },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          status,
          result,
          endedAt: new Date(),
        },
      });

      return {
        playerMove: {
          san: playerMoveObj.san,
          uci: `${playerMoveObj.from}${playerMoveObj.to}${playerMoveObj.promotion || ""}`,
        },
        botMove: null,
        fen: chess.fen(),
        status,
        result,
      };
    }

    const botMoveObj = await this.getBotMove(chess, session.opponentType, userId);
    let botMoveResult = null;

    if (botMoveObj) {
      chess.move(botMoveObj);
      botMoveResult = {
        san: botMoveObj.san,
        uci: `${botMoveObj.from}${botMoveObj.to}${botMoveObj.promotion || ""}`,
      };

      if (chess.isGameOver()) {
        status = "COMPLETED";
        if (chess.isCheckmate()) {
          result = "LOSS";
        } else {
          result = "DRAW";
        }
      }
    }

    await prisma.playSession.update({
      where: { id: session.id },
      data: {
        fen: chess.fen(),
        pgn: chess.pgn(),
        status,
        result: result || null,
        endedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    return {
      playerMove: {
        san: playerMoveObj.san,
        uci: `${playerMoveObj.from}${playerMoveObj.to}${playerMoveObj.promotion || ""}`,
      },
      botMove: botMoveResult,
      fen: chess.fen(),
      status,
      result,
    };
  }

  static async resignSession(userId, sessionId) {
    const session = await prisma.playSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new Error("SESSION_NOT_FOUND");
    }

    await prisma.playSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        result: "LOSS",
        endedAt: new Date(),
      },
    });

    return {
      status: "COMPLETED",
      result: "LOSS",
    };
  }

  static async getBotMove(chess, opponentType, userId) {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    const dna = await ChessDNAService.getCurrentDNA(userId);
    const peak = await PeakSelfService.getCurrentPeakSelf(userId);

    const isPeak = opponentType === "PEAK_SELF";
    const currentTurn = chess.turn();

    let moveCandidates = await Promise.all(
      moves.map(async (m) => {
        const copy = new Chess(chess.fen());
        copy.move(m);
        const evalRes = await ChessEngineService.evaluatePositionAsync(copy.fen());

        let score = currentTurn === "w" ? evalRes.score : -evalRes.score;

        if (!isPeak) {
          if (m.san.includes("+")) score += dna.metrics.aggression * 0.8;
          if (m.san.includes("x")) score += dna.metrics.tacticalPreference * 0.7;
          if (m.piece === "n" || m.piece === "q") score += dna.metrics.riskTaking * 0.3;
        } else {
          if (copy.inCheck()) score += 80;
          if (m.san.includes("x")) score += peak.strengthProfile.tactical * 0.5;
          if (m.piece === "k" && copy.moves().length > 30) score -= 100;
        }

        return { move: m, score };
      })
    );

    moveCandidates.sort((a, b) => b.score - a.score);

    if (isPeak) {
      return moveCandidates[0].move;
    } else {
      const topCandidates = moveCandidates.slice(0, Math.min(3, moveCandidates.length));
      const pick = topCandidates[Math.floor(Math.random() * topCandidates.length)];
      return pick.move;
    }
  }
}
