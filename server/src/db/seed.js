import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ChessDNAService } from "../services/dna/service.js";
import { PeakSelfService } from "../services/peak-self/service.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Chess Evolve initial database...");

  const existing = await prisma.user.findUnique({
    where: { email: "player@example.com" },
  });

  if (existing) {
    console.log("Demo user already exists. Skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.create({
    data: {
      email: "player@example.com",
      displayName: "Grandmaster Candidate",
      passwordHash,
      chessProfile: {
        create: {
          username: "hikaru",
          title: "GM",
          avatarUrl: "https://images.chesscomfiles.com/uploads/v1/user/1544848.3a388bc6.160x160o.78f3521ed67d.png",
          country: "US",
          gamesImported: 42,
          gamesAnalyzed: 42,
          lastSyncedAt: new Date(),
        },
      },
    },
  });

  const pgnSample = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.09.20"]
[White "hikaru"]
[Black "opponent123"]
[Result "1-0"]
[ECO "B20"]
[Opening "Sicilian Defense"]
[TimeControl "600+5"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 11. g4 b5 12. g5 b4 13. Ne2 Ne8 14. f4 a5 15. f5 a4 16. Nbd4 exd4 17. Nxd4 b3 18. Kb1 bxc2+ 19. Nxc2 Bb3 20. axb3 axb3 21. Na3 Ne5 22. h4 Ra4 23. Qg2 Qa8 24. Bd4 Nc7 25. f6 Bd8 26. Bxe5 dxe5 27. Bc4 Ne6 28. Bxb3 Rxa3 29. bxa3 Nd4 30. Bd5 Qxa3 31. Rh3 Qa5 32. Qa2 Qc7 33. Qc4 Qb6+ 34. Ka2 Qa7+ 35. Ra3 Ba5 36. fxg7 Kxg7 37. Rf1 1-0`;

  const profile = await prisma.chessProfile.findUnique({ where: { userId: user.id } });

  if (profile) {
    const game = await prisma.game.create({
      data: {
        userId: user.id,
        chessProfileId: profile.id,
        externalId: "chesscom_game_seed_1",
        playedAt: new Date(),
        white: "hikaru",
        black: "opponent123",
        result: "1-0",
        playerColor: "WHITE",
        playerRating: 1428,
        opponentRating: 1402,
        timeControl: "600+5",
        eco: "B20",
        openingName: "Sicilian Defense, Najdorf Variation",
        pgn: pgnSample,
        accuracy: 87.4,
      },
    });

    await prisma.gameAnalysis.create({
      data: {
        gameId: game.id,
        status: "COMPLETED",
        depth: 16,
        playerAccuracy: 87.4,
        opponentAccuracy: 78.2,
        blunders: 0,
        mistakes: 1,
        inaccuracies: 2,
        analysisJson: JSON.stringify({
          playerAccuracy: 87.4,
          opponentAccuracy: 78.2,
          blunders: 0,
          mistakes: 1,
          inaccuracies: 2,
          excellentMoves: 14,
          criticalMoments: [
            {
              moveNumber: 17,
              fen: "r2qk2r/1b1nbppp/p2p1n2/4pP2/1p1NP1P1/2N2F2/PPPQ3P/2KR1B1R w kq - 0 17",
              playedMove: "Nxd4",
              bestMove: "Nxd4",
              evaluationBefore: 0.4,
              evaluationAfter: 1.2,
              evaluationLoss: 0.1,
              severity: "EXCELLENT",
              comment: "Strong central knight sacrifice opening tactical lines.",
            },
          ],
        }),
      },
    });
  }

  await ChessDNAService.generateDNA(user.id);
  await PeakSelfService.generatePeakSelf(user.id);

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
