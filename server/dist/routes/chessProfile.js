"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const auth_1 = require("../middleware/auth");
const client_2 = require("../services/chesscom/client");
const syncJob_1 = require("../services/jobs/syncJob");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const connectSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .trim()
        .min(3)
        .max(50)
        .regex(/^[a-zA-Z0-9_-]+$/, "Invalid Chess.com username format"),
});
router.post("/connect", auth_1.authenticate, async (req, res) => {
    const result = connectSchema.safeParse(req.body);
    if (!result.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Invalid username", 400, result.error.format());
    }
    const { username } = result.data;
    const userId = req.user.userId;
    try {
        const comProfile = await client_2.ChessComClient.getPlayerProfile(username);
        const archives = await client_2.ChessComClient.getGameArchives(username);
        let profile = await prisma.chessProfile.findUnique({
            where: { userId },
        });
        if (profile) {
            profile = await prisma.chessProfile.update({
                where: { userId },
                data: {
                    username: comProfile.username,
                    profileUrl: comProfile.url,
                    avatarUrl: comProfile.avatar || null,
                    country: comProfile.country || null,
                    title: comProfile.title || null,
                    joinedAt: comProfile.joined ? new Date(comProfile.joined * 1000) : null,
                },
            });
        }
        else {
            profile = await prisma.chessProfile.create({
                data: {
                    userId,
                    username: comProfile.username,
                    profileUrl: comProfile.url,
                    avatarUrl: comProfile.avatar || null,
                    country: comProfile.country || null,
                    title: comProfile.title || null,
                    joinedAt: comProfile.joined ? new Date(comProfile.joined * 1000) : null,
                },
            });
        }
        // Automatically trigger initial game sync job
        const syncRes = await syncJob_1.SyncJobManager.startSyncJob(userId, false);
        return (0, apiResponse_1.sendSuccess)(res, {
            profile: {
                id: profile.id,
                username: profile.username,
                title: profile.title,
                avatarUrl: profile.avatarUrl,
                country: profile.country,
                joinedAt: profile.joinedAt,
            },
            sync: {
                jobId: syncRes.jobId,
                status: "READY",
                archiveCount: archives.length,
                estimatedGames: archives.length * 70,
            },
        });
    }
    catch (err) {
        if (err.message === "NOT_FOUND") {
            return (0, apiResponse_1.sendError)(res, "CHESS_PROFILE_NOT_FOUND", "We couldn't find this Chess.com profile.", 444);
        }
        return (0, apiResponse_1.sendError)(res, "CHESS_API_ERROR", err.message || "Failed to fetch Chess.com profile.", 500);
    }
});
router.get("/", auth_1.authenticate, async (req, res) => {
    const profile = await prisma.chessProfile.findUnique({
        where: { userId: req.user.userId },
    });
    if (!profile) {
        return (0, apiResponse_1.sendError)(res, "CHESS_PROFILE_NOT_FOUND", "No Chess.com profile connected.", 404);
    }
    return (0, apiResponse_1.sendSuccess)(res, {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        title: profile.title,
        lastSyncedAt: profile.lastSyncedAt,
        gamesImported: profile.gamesImported,
        gamesAnalyzed: profile.gamesAnalyzed,
        dnaVersion: profile.dnaVersion,
        peakSelfVersion: profile.peakSelfVersion,
    });
});
exports.default = router;
