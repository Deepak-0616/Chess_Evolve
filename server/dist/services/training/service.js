"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingService = void 0;
const client_1 = require("@prisma/client");
const service_1 = require("../dna/service");
const prisma = new client_1.PrismaClient();
class TrainingService {
    /**
     * Pre-curated high quality puzzle positions per weakness topic.
     */
    static PUZZLE_BANK = {
        "Knight forks": [
            {
                id: "fork_1",
                fen: "r1bqk2r/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
                solutionSan: "Bxf7+",
                solutionUci: "c4f7",
                description: "White has a tactical fork / king disruption. Find the move!",
                hint: "Target the vulnerable f7 pawn with your bishop.",
            },
            {
                id: "fork_2",
                fen: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 2 3",
                solutionSan: "Nf3",
                solutionUci: "g1f3",
                description: "Consolidate central control and prepare knight jumps.",
                hint: "Develop your kingside knight to attack e5.",
            },
            {
                id: "fork_3",
                fen: "r2qkb1r/pp3ppp/2n1pn2/3p4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 7",
                solutionSan: "Ne5",
                solutionUci: "f3e5",
                description: "Post a powerful knight outpost on e5 threatening forks and piece pressure.",
                hint: "Occupying e5 forces Black onto defense.",
            },
        ],
        "Defending kingside attacks": [
            {
                id: "def_1",
                fen: "r1b2rk1/pp1p1ppp/2n1p3/q7/2P1P3/2NB4/PP1Q1PPP/R3K2R w KQ - 0 11",
                solutionSan: "O-O",
                solutionUci: "e1g1",
                description: "Secure your king immediately before Black opens the central lines.",
                hint: "Castle kingside to complete development and protect your monarch.",
            },
            {
                id: "def_2",
                fen: "r2q1rk1/ppp2ppp/2n1bn2/3pp3/4P3/2PP1N2/PPB2PPP/R1BQK2R w KQ - 0 10",
                solutionSan: "Qe2",
                solutionUci: "d1e2",
                description: "Reinforce e4 and connect rooks to defend against kingside maneuvers.",
                hint: "Develop the queen to guard central pawns.",
            },
        ],
        "Premature attacks": [
            {
                id: "prem_1",
                fen: "r1bqk2r/pppp1ppp/2n2n2/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 1 5",
                solutionSan: "Bd2",
                solutionUci: "c1d2",
                description: "Unpin your knight and complete development cleanly.",
                hint: "Develop the bishop to d2 to neutralize the pin on c3.",
            },
        ],
        "Endgame Tactics": [
            {
                id: "end_1",
                fen: "8/8/4k3/3p4/3P4/4K3/8/8 w - - 0 1",
                solutionSan: "Kf4",
                solutionUci: "e3f4",
                description: "Gain key opposition in a pawn endgame.",
                hint: "Step your king to f4 to force Black's king back.",
            },
        ],
    };
    static async getRecommendations(userId) {
        const dna = await service_1.ChessDNAService.getCurrentDNA(userId);
        const recommendations = dna.weaknesses.map((w, idx) => ({
            id: `rec_${w.id || idx}`,
            category: "TACTICS",
            topic: w.name,
            reason: w.description || `Recurring weakness detected across analyzed games.`,
            difficulty: idx === 0 ? "INTERMEDIATE" : "ADVANCED",
            positionCount: 5,
        }));
        if (recommendations.length === 0) {
            recommendations.push({
                id: "rec_default",
                category: "TACTICS",
                topic: "Knight forks",
                reason: "Sharpen your tactical double attacks and knight outpost vision.",
                difficulty: "INTERMEDIATE",
                positionCount: 5,
            });
        }
        return recommendations;
    }
    static async startSession(userId, category, topic, positionCount = 5) {
        const session = await prisma.trainingSession.create({
            data: {
                userId,
                category,
                topic,
                totalPositions: Math.min(positionCount, 10),
            },
        });
        const puzzles = this.PUZZLE_BANK[topic] || this.PUZZLE_BANK["Knight forks"];
        return {
            sessionId: session.id,
            category: session.category,
            topic: session.topic,
            totalPositions: puzzles.length,
            positions: puzzles.slice(0, positionCount).map((p) => ({
                id: p.id,
                fen: p.fen,
                description: p.description,
                hint: p.hint,
            })),
        };
    }
    static async submitAttempt(userId, sessionId, positionId, move, timeSpentMs) {
        const session = await prisma.trainingSession.findUnique({
            where: { id: sessionId },
            include: { attempts: true },
        });
        if (!session || session.userId !== userId) {
            throw new Error("SESSION_NOT_FOUND");
        }
        // Find puzzle in bank
        let puzzle;
        for (const topKey in this.PUZZLE_BANK) {
            const found = this.PUZZLE_BANK[topKey].find((p) => p.id === positionId);
            if (found) {
                puzzle = found;
                break;
            }
        }
        if (!puzzle) {
            throw new Error("POSITION_NOT_FOUND");
        }
        const playedUci = `${move.from}${move.to}`.toLowerCase();
        const correct = playedUci === puzzle.solutionUci.toLowerCase();
        await prisma.trainingAttempt.create({
            data: {
                sessionId,
                positionId,
                correct,
                timeSpentMs,
            },
        });
        if (correct) {
            await prisma.trainingSession.update({
                where: { id: sessionId },
                data: { correctAnswers: { increment: 1 } },
            });
        }
        return {
            correct,
            bestMove: puzzle.solutionSan,
            explanation: correct
                ? "Excellent move! You executed the exact tactical continuation required."
                : `Inaccurate move. The best move was ${puzzle.solutionSan}. ${puzzle.hint}`,
        };
    }
}
exports.TrainingService = TrainingService;
