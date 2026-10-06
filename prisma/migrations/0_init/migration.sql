-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('IDLE', 'SYNCING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MoveClassification" AS ENUM ('BEST', 'GOOD', 'INACCURACY', 'MISTAKE', 'BLUNDER');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('OPENING', 'MIDDLEGAME', 'ENDGAME');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('CURRENT_SELF', 'PEAK_SELF');

-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('NOT_AVAILABLE', 'INSUFFICIENT_DATA', 'DATASET_GENERATING', 'TRAINING', 'VALIDATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "PlaySessionStatus" AS ENUM ('IN_PROGRESS', 'USER_WON', 'MODEL_WON', 'DRAW', 'RESIGNED');

-- CreateEnum
CREATE TYPE "ArenaVisibility" AS ENUM ('PRIVATE', 'DISCOVERABLE', 'PUBLIC');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChessProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chessUsername" TEXT NOT NULL,
    "playerUrl" TEXT,
    "title" TEXT,
    "avatarUrl" TEXT,
    "country" TEXT,
    "followers" INTEGER,
    "joinedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "syncProgress" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "chessProfileId" TEXT NOT NULL,
    "url" TEXT,
    "pgn" TEXT NOT NULL,
    "timeControl" TEXT NOT NULL,
    "timeClass" TEXT NOT NULL,
    "rated" BOOLEAN NOT NULL DEFAULT true,
    "whiteUsername" TEXT NOT NULL,
    "whiteRating" INTEGER NOT NULL,
    "blackUsername" TEXT NOT NULL,
    "blackRating" INTEGER NOT NULL,
    "userColor" TEXT NOT NULL,
    "userRating" INTEGER NOT NULL,
    "opponentUsername" TEXT NOT NULL,
    "opponentRating" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "endReason" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "analyzed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAnalysis" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "avgCpLoss" DOUBLE PRECISION NOT NULL,
    "inaccuracies" INTEGER NOT NULL,
    "mistakes" INTEGER NOT NULL,
    "blunders" INTEGER NOT NULL,
    "openingName" TEXT,
    "openingEco" TEXT,
    "openingAccuracy" DOUBLE PRECISION,
    "middlegameAccuracy" DOUBLE PRECISION,
    "endgameAccuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionAnalysis" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "ply" INTEGER NOT NULL,
    "fen" TEXT NOT NULL,
    "move" TEXT NOT NULL,
    "playerMove" BOOLEAN NOT NULL,
    "evalBefore" DOUBLE PRECISION NOT NULL,
    "evalAfter" DOUBLE PRECISION NOT NULL,
    "cpLoss" DOUBLE PRECISION NOT NULL,
    "bestMove" TEXT NOT NULL,
    "candidateMoves" JSONB NOT NULL,
    "classification" "MoveClassification" NOT NULL,
    "gamePhase" "GamePhase" NOT NULL,
    "materialBalance" DOUBLE PRECISION NOT NULL,
    "kingSafetyScore" DOUBLE PRECISION NOT NULL,
    "tacticalScore" DOUBLE PRECISION NOT NULL,
    "positionalScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChessDNA" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "aggression" DOUBLE PRECISION NOT NULL,
    "riskTaking" DOUBLE PRECISION NOT NULL,
    "tacticalPreference" DOUBLE PRECISION NOT NULL,
    "positionalPreference" DOUBLE PRECISION NOT NULL,
    "defensiveAbility" DOUBLE PRECISION NOT NULL,
    "sacrificeTendency" DOUBLE PRECISION NOT NULL,
    "tradingTendency" DOUBLE PRECISION NOT NULL,
    "openingDiversity" DOUBLE PRECISION NOT NULL,
    "endgameAbility" DOUBLE PRECISION NOT NULL,
    "kingSafety" DOUBLE PRECISION NOT NULL,
    "attackPreference" DOUBLE PRECISION NOT NULL,
    "simplificationPreference" DOUBLE PRECISION NOT NULL,
    "timePressureBehavior" DOUBLE PRECISION NOT NULL,
    "topStrengths" JSONB NOT NULL,
    "topWeaknesses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChessDNA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChessDNAVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "aggression" DOUBLE PRECISION NOT NULL,
    "riskTaking" DOUBLE PRECISION NOT NULL,
    "tacticalPreference" DOUBLE PRECISION NOT NULL,
    "positionalPreference" DOUBLE PRECISION NOT NULL,
    "defensiveAbility" DOUBLE PRECISION NOT NULL,
    "sacrificeTendency" DOUBLE PRECISION NOT NULL,
    "tradingTendency" DOUBLE PRECISION NOT NULL,
    "openingDiversity" DOUBLE PRECISION NOT NULL,
    "endgameAbility" DOUBLE PRECISION NOT NULL,
    "kingSafety" DOUBLE PRECISION NOT NULL,
    "attackPreference" DOUBLE PRECISION NOT NULL,
    "simplificationPreference" DOUBLE PRECISION NOT NULL,
    "timePressureBehavior" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChessDNAVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLModelVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelType" "ModelType" NOT NULL,
    "version" INTEGER NOT NULL,
    "dnaVersion" INTEGER,
    "gamesUsed" INTEGER NOT NULL,
    "positionsUsed" INTEGER NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "metrics" JSONB,
    "featureVersion" TEXT NOT NULL DEFAULT 'v1',
    "artifactPath" TEXT,
    "trainedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetWeakness" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "positions" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opponentModelType" "ModelType" NOT NULL,
    "opponentModelVersionId" TEXT,
    "userColor" TEXT NOT NULL,
    "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "pgn" TEXT NOT NULL DEFAULT '',
    "moveHistory" JSONB NOT NULL,
    "status" "PlaySessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visibility" "ArenaVisibility" NOT NULL DEFAULT 'PRIVATE',
    "rating" INTEGER NOT NULL DEFAULT 1500,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaSession" (
    "id" TEXT NOT NULL,
    "challengerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetModelType" "ModelType" NOT NULL,
    "targetModelVersionId" TEXT NOT NULL,
    "status" "PlaySessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "pgn" TEXT NOT NULL DEFAULT '',
    "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "moveHistory" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChessProfile_userId_key" ON "ChessProfile"("userId");

-- CreateIndex
CREATE INDEX "Game_chessProfileId_playedAt_idx" ON "Game"("chessProfileId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GameAnalysis_gameId_key" ON "GameAnalysis"("gameId");

-- CreateIndex
CREATE INDEX "PositionAnalysis_gameId_ply_idx" ON "PositionAnalysis"("gameId", "ply");

-- CreateIndex
CREATE UNIQUE INDEX "ChessDNA_userId_key" ON "ChessDNA"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChessDNAVersion_userId_version_key" ON "ChessDNAVersion"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "MLModelVersion_userId_modelType_version_key" ON "MLModelVersion"("userId", "modelType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaProfile_userId_key" ON "ArenaProfile"("userId");

-- AddForeignKey
ALTER TABLE "ChessProfile" ADD CONSTRAINT "ChessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_chessProfileId_fkey" FOREIGN KEY ("chessProfileId") REFERENCES "ChessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalysis" ADD CONSTRAINT "GameAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAnalysis" ADD CONSTRAINT "PositionAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChessDNA" ADD CONSTRAINT "ChessDNA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChessDNAVersion" ADD CONSTRAINT "ChessDNAVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLModelVersion" ADD CONSTRAINT "MLModelVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_opponentModelVersionId_fkey" FOREIGN KEY ("opponentModelVersionId") REFERENCES "MLModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaProfile" ADD CONSTRAINT "ArenaProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaSession" ADD CONSTRAINT "ArenaSession_challengerUserId_fkey" FOREIGN KEY ("challengerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaSession" ADD CONSTRAINT "ArenaSession_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "ArenaProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaSession" ADD CONSTRAINT "ArenaSession_targetModelVersionId_fkey" FOREIGN KEY ("targetModelVersionId") REFERENCES "MLModelVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

