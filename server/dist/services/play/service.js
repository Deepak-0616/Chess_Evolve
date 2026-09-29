"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayService = void 0;
const chess_js_1 = require("chess.js");
const client_1 = require("@prisma/client");
const service_1 = require("../chess-engine/service");
const service_2 = require("../dna/service");
const service_3 = require("../peak-self/service");
const prisma = new client_1.PrismaClient();
class PlayService {
    static async createSession(userId, opponentType, color) {
        const chess = new chess_js_1.Chess();
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
        // If bot plays White, bot makes the first move!
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
        const chess = new chess_js_1.Chess(session.fen);
        // Apply player move
        let playerMoveObj;
        try {
            playerMoveObj = chess.move({
                from: move.from,
                to: move.to,
                promotion: move.promotion || "q",
            });
        }
        catch (e) {
            throw new Error("INVALID_MOVE");
        }
        let status = "ACTIVE";
        let result;
        if (chess.isGameOver()) {
            status = "COMPLETED";
            if (chess.isCheckmate()) {
                result = "WIN"; // Player won
            }
            else {
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
        // Bot move
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
                    result = "LOSS"; // Bot won
                }
                else {
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
    /**
     * Generates intelligent bot move tailored to player style (Current Self vs Peak Self).
     */
    static async getBotMove(chess, opponentType, userId) {
        const moves = chess.moves({ verbose: true });
        if (moves.length === 0)
            return null;
        const dna = await service_2.ChessDNAService.getCurrentDNA(userId);
        const peak = await service_3.PeakSelfService.getCurrentPeakSelf(userId);
        const isPeak = opponentType === "PEAK_SELF";
        const currentTurn = chess.turn();
        // Evaluate all legal candidate moves
        let moveCandidates = moves.map((m) => {
            const copy = new chess_js_1.Chess(chess.fen());
            copy.move(m);
            const evalRes = service_1.ChessEngineService.evaluatePosition(copy.fen());
            // Score relative to bot
            let score = currentTurn === "w" ? evalRes.score : -evalRes.score;
            // Current Self style bias: favors checks, captures, and aggressive piece placement if aggression high
            if (!isPeak) {
                if (m.san.includes("+"))
                    score += dna.metrics.aggression * 0.8;
                if (m.san.includes("x"))
                    score += dna.metrics.tacticalPreference * 0.7;
                if (m.piece === "n" || m.piece === "q")
                    score += dna.metrics.riskTaking * 0.3;
            }
            else {
                // Peak Self style bias: higher tactical accuracy, strict defense, blunder rejection
                if (copy.inCheck())
                    score += 80;
                if (m.san.includes("x"))
                    score += peak.strengthProfile.tactical * 0.5;
                // Avoid weak king position
                if (m.piece === "k" && copy.moves().length > 30)
                    score -= 100;
            }
            return { move: m, score };
        });
        // Sort candidates descending by score
        moveCandidates.sort((a, b) => b.score - a.score);
        // Current Self takes top 3 candidate with some variation; Peak Self takes top candidate
        if (isPeak) {
            return moveCandidates[0].move;
        }
        else {
            const topCandidates = moveCandidates.slice(0, Math.min(3, moveCandidates.length));
            const pick = topCandidates[Math.floor(Math.random() * topCandidates.length)];
            return pick.move;
        }
    }
}
exports.PlayService = PlayService;
