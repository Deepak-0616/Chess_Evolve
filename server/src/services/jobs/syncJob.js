import { PrismaClient } from "@prisma/client";
import { ChessComClient } from "../chesscom/client.js";
import { PgnParser } from "../chesscom/parser.js";
import { ChessEngineService } from "../chess-engine/service.js";
import { ChessDNAService } from "../dna/service.js";
import { PeakSelfService } from "../peak-self/service.js";

const prisma = new PrismaClient();

export class SyncJobManager {
  static async startSyncJob(userId, fullSync = false) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { chessProfile: true },
    });

    if (!user || !user.chessProfile) {
      throw new Error("CHESS_PROFILE_NOT_FOUND");
    }

    const job = await prisma.syncJob.create({
      data: {
        userId,
        status: "QUEUED",
        currentStage: "FETCHING_PROFILE",
        progressJson: JSON.stringify({
          archivesDiscovered: 0,
          archivesProcessed: 0,
          gamesDiscovered: 0,
          gamesImported: 0,
          gamesSkipped: 0,
        }),
      },
    });

    setImmediate(() => {
      this.executeSync(job.id, userId, user.chessProfile.username, fullSync).catch((err) => {
        console.error(`Sync job ${job.id} failed:`, err);
      });
    });

    return {
      jobId: job.id,
      status: job.status,
    };
  }

  static async getJobStatus(jobId, userId) {
    const job = await prisma.syncJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      throw new Error("JOB_NOT_FOUND");
    }

    const progress = JSON.parse(job.progressJson);

    return {
      jobId: job.id,
      status: job.status,
      currentStage: job.currentStage,
      progress,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  static async executeSync(jobId, userId, username, fullSync) {
    try {
      await prisma.syncJob.update({
        where: { id: jobId },
        data: { status: "PROCESSING", currentStage: "FETCHING_ARCHIVES" },
      });

      const archives = await ChessComClient.getGameArchives(username);
      const targetArchives = fullSync ? archives : archives.slice(-6);

      let gamesDiscovered = 0;
      let gamesImported = 0;
      let gamesSkipped = 0;
      let archivesProcessed = 0;

      const chessProfile = await prisma.chessProfile.findUnique({
        where: { userId },
      });

      if (!chessProfile) return;

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          currentStage: "IMPORTING_GAMES",
          progressJson: JSON.stringify({
            archivesDiscovered: targetArchives.length,
            archivesProcessed: 0,
            gamesDiscovered: 0,
            gamesImported: 0,
            gamesSkipped: 0,
          }),
        },
      });

      for (const archiveUrl of targetArchives) {
        try {
          const rawGames = await ChessComClient.getGamesFromArchive(archiveUrl);
          gamesDiscovered += rawGames.length;

          for (const rawGame of rawGames) {
            const parsed = PgnParser.parseChessComGame(rawGame, username);
            if (!parsed) {
              gamesSkipped++;
              continue;
            }

            const existing = await prisma.game.findUnique({
              where: {
                chessProfileId_externalId: {
                  chessProfileId: chessProfile.id,
                  externalId: parsed.externalId,
                },
              },
            });

            if (existing) {
              gamesSkipped++;
              continue;
            }

            const analysisRes = ChessEngineService.analyzeGame(parsed.pgn, parsed.playerColor);

            const createdGame = await prisma.game.create({
              data: {
                userId,
                chessProfileId: chessProfile.id,
                externalId: parsed.externalId,
                playedAt: parsed.playedAt,
                white: parsed.white,
                black: parsed.black,
                result: parsed.result,
                playerColor: parsed.playerColor,
                playerRating: parsed.playerRating,
                opponentRating: parsed.opponentRating,
                timeControl: parsed.timeControl,
                eco: parsed.eco,
                openingName: parsed.openingName,
                pgn: parsed.pgn,
                accuracy: analysisRes.playerAccuracy,
                moves: {
                  create: parsed.moves,
                },
              },
            });

            await prisma.gameAnalysis.create({
              data: {
                gameId: createdGame.id,
                status: "COMPLETED",
                depth: 14,
                playerAccuracy: analysisRes.playerAccuracy,
                opponentAccuracy: analysisRes.opponentAccuracy,
                blunders: analysisRes.blunders,
                mistakes: analysisRes.mistakes,
                inaccuracies: analysisRes.inaccuracies,
                analysisJson: JSON.stringify(analysisRes),
              },
            });

            gamesImported++;
          }

          archivesProcessed++;

          await prisma.syncJob.update({
            where: { id: jobId },
            data: {
              progressJson: JSON.stringify({
                archivesDiscovered: targetArchives.length,
                archivesProcessed,
                gamesDiscovered,
                gamesImported,
                gamesSkipped,
              }),
            },
          });
        } catch (archErr) {
          console.warn(`Error processing archive ${archiveUrl}:`, archErr);
        }
      }

      await prisma.syncJob.update({
        where: { id: jobId },
        data: { currentStage: "ANALYZING_GAMES" },
      });

      await ChessDNAService.generateDNA(userId);
      await PeakSelfService.generatePeakSelf(userId);

      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          currentStage: "COMPLETED",
          progressJson: JSON.stringify({
            archivesDiscovered: targetArchives.length,
            archivesProcessed: targetArchives.length,
            gamesDiscovered,
            gamesImported,
            gamesSkipped,
          }),
        },
      });

      await prisma.chessProfile.update({
        where: { id: chessProfile.id },
        data: {
          lastSyncedAt: new Date(),
          gamesImported: { increment: gamesImported },
          gamesAnalyzed: { increment: gamesImported },
        },
      });
    } catch (err) {
      console.error("Job execution failed:", err);
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: err?.message || "Internal sync error",
        },
      });
    }
  }
}
