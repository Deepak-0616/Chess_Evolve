"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeakSelfService = void 0;
const client_1 = require("@prisma/client");
const service_1 = require("../dna/service");
const prisma = new client_1.PrismaClient();
class PeakSelfService {
    static async generatePeakSelf(userId) {
        const currentDna = await service_1.ChessDNAService.getCurrentDNA(userId);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                peakSelfVersions: {
                    orderBy: { version: "desc" },
                    take: 1,
                },
                chessProfile: true,
            },
        });
        const latestVer = user?.peakSelfVersions[0]?.version || 0;
        const newVer = latestVer + 1;
        // Peak Self Style: Keeps style flavor while tuning decision quality
        const styleProfile = {
            aggression: Math.min(95, Math.max(50, currentDna.metrics.aggression)),
            riskTaking: Math.min(80, Math.max(40, currentDna.metrics.riskTaking * 0.85)), // Controlled risk
            sacrificeTendency: Math.min(85, Math.max(30, currentDna.metrics.sacrificeTendency * 0.9)),
        };
        // Peak Self Strength Profile: Enhanced tactical, positional, defensive & endgame calculation
        const strengthProfile = {
            tactical: Math.min(99, Math.round(currentDna.metrics.tacticalPreference * 1.15 + 10)),
            positional: Math.min(99, Math.round(currentDna.metrics.positionalPreference * 1.2 + 15)),
            defense: Math.min(99, Math.round(currentDna.metrics.defensiveAbility * 1.25 + 20)), // Eliminates defensive flaws
            endgame: Math.min(99, Math.round(currentDna.metrics.endgameAbility * 1.2 + 15)),
        };
        const configuration = {
            searchDepth: 18,
            weaknessAvoidanceRules: [
                "Shield castled king before launching pawns",
                "Scan knight jumps onto 5th/6th rank outposts",
                "Verify piece support before initiating sacrifices",
            ],
            blunderCheckDepth: 2,
            tacticalAggressionFactor: Number((styleProfile.aggression / 100).toFixed(2)),
        };
        const created = await prisma.peakSelfVersion.create({
            data: {
                userId,
                version: newVer,
                dnaVersion: currentDna.version,
                styleProfile: JSON.stringify(styleProfile),
                strengthProfile: JSON.stringify(strengthProfile),
                configuration: JSON.stringify(configuration),
            },
        });
        if (user?.chessProfile) {
            await prisma.chessProfile.update({
                where: { id: user.chessProfile.id },
                data: { peakSelfVersion: newVer },
            });
        }
        return {
            version: created.version,
            dnaVersion: created.dnaVersion,
            styleProfile,
            strengthProfile,
            configuration,
            generatedAt: created.generatedAt,
        };
    }
    static async getCurrentPeakSelf(userId) {
        const latest = await prisma.peakSelfVersion.findFirst({
            where: { userId },
            orderBy: { version: "desc" },
        });
        if (!latest) {
            return this.generatePeakSelf(userId);
        }
        return {
            version: latest.version,
            dnaVersion: latest.dnaVersion,
            styleProfile: JSON.parse(latest.styleProfile),
            strengthProfile: JSON.parse(latest.strengthProfile),
            configuration: JSON.parse(latest.configuration),
            generatedAt: latest.generatedAt,
        };
    }
}
exports.PeakSelfService = PeakSelfService;
