-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FeatureGenerationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DatasetStatus" AS ENUM ('PENDING', 'RUNNING', 'VALIDATING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DatasetType" AS ENUM ('CURRENT_SELF', 'PEAK_SELF');

-- AlterEnum
BEGIN;
CREATE TYPE "ModelStatus_new" AS ENUM ('NOT_AVAILABLE', 'INSUFFICIENT_DATA', 'QUEUED', 'TRAINING', 'VALIDATING', 'READY', 'ACTIVE', 'SUPERSEDED', 'REJECTED', 'FAILED');
ALTER TABLE "MLModelVersion" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "MLModelVersion" ALTER COLUMN "status" TYPE "ModelStatus_new" USING ("status"::text::"ModelStatus_new");
ALTER TYPE "ModelStatus" RENAME TO "ModelStatus_old";
ALTER TYPE "ModelStatus_new" RENAME TO "ModelStatus";
DROP TYPE "ModelStatus_old";
ALTER TABLE "MLModelVersion" ALTER COLUMN "status" SET DEFAULT 'NOT_AVAILABLE';
COMMIT;

-- DropForeignKey
ALTER TABLE "ArenaSession" DROP CONSTRAINT "ArenaSession_challengerUserId_fkey";

-- DropForeignKey
ALTER TABLE "ArenaSession" DROP CONSTRAINT "ArenaSession_targetUserId_fkey";

-- DropForeignKey
ALTER TABLE "ArenaSession" DROP CONSTRAINT "ArenaSession_targetModelVersionId_fkey";

-- AlterTable
ALTER TABLE "MLModelVersion" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "architectureVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "artifactChecksum" TEXT,
ADD COLUMN     "baselineMetrics" JSONB,
ADD COLUMN     "behavioralMetrics" JSONB,
ADD COLUMN     "datasetVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "dependentModelVersionId" TEXT,
ADD COLUMN     "evaluationArtifactPath" TEXT,
ADD COLUMN     "evaluationCompletedAt" TIMESTAMP(3),
ADD COLUMN     "evaluationMetrics" JSONB,
ADD COLUMN     "evaluationStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualityGateResult" JSONB,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "trainingConfigVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "trainingJobId" TEXT,
ALTER COLUMN "gamesUsed" SET DEFAULT 0,
ALTER COLUMN "positionsUsed" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "TrainingSession" DROP COLUMN "positions",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'TACTICAL',
ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
ADD COLUMN     "positionsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "positionsPlanned" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "trainingPlanId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PlaySession" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "dependentModelVersionId" TEXT,
ADD COLUMN     "result" TEXT,
ADD COLUMN     "terminationReason" TEXT;

-- AlterTable
ALTER TABLE "ArenaProfile" DROP COLUMN "draws",
DROP COLUMN "losses",
DROP COLUMN "rating",
DROP COLUMN "totalGames",
DROP COLUMN "wins",
ADD COLUMN     "arenaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "displayName" TEXT;

-- DropTable
DROP TABLE "ArenaSession";

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "focusCategory" TEXT NOT NULL,
    "targetWeakness" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "sourceAnalysisVersion" TEXT DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingPlanId" TEXT,
    "trainingSessionId" TEXT,
    "gameId" TEXT NOT NULL,
    "positionAnalysisId" TEXT,
    "moveNumber" INTEGER NOT NULL,
    "fen" TEXT NOT NULL,
    "sideToMove" TEXT NOT NULL,
    "weaknessCategory" TEXT NOT NULL,
    "weaknessScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "recurrenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "targetMove" TEXT NOT NULL,
    "targetMoveUci" TEXT,
    "playerHistoricalMove" TEXT,
    "playerHistoricalClass" TEXT,
    "playerHistoricalCpLoss" DOUBLE PRECISION,
    "candidateMoves" JSONB NOT NULL,
    "metadata" JSONB,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingSessionId" TEXT NOT NULL,
    "trainingPositionId" TEXT NOT NULL,
    "submittedMove" TEXT NOT NULL,
    "submittedMoveUci" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "quality" TEXT NOT NULL,
    "engineRank" INTEGER,
    "cpLoss" DOUBLE PRECISION,
    "currentSelfMove" TEXT,
    "currentSelfConfidence" DOUBLE PRECISION,
    "currentSelfRank" INTEGER,
    "peakSelfMove" TEXT,
    "peakSelfConfidence" DOUBLE PRECISION,
    "peakSelfRank" INTEGER,
    "explanation" TEXT,
    "timeSpentMs" INTEGER,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalSessionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalPositionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalPositionsSolved" INTEGER NOT NULL DEFAULT 0,
    "overallSuccessRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "categoryPerformance" JSONB NOT NULL DEFAULT '{}',
    "weaknessProgression" JSONB NOT NULL DEFAULT '{}',
    "currentDifficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastTrainingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaModel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mlModelVersionId" TEXT NOT NULL,
    "modelType" "ModelType" NOT NULL,
    "visibility" "ArenaVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelType" "ModelType" NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1500,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaMatch" (
    "id" TEXT NOT NULL,
    "status" "PlaySessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "whiteUserId" TEXT NOT NULL,
    "whiteModelVersionId" TEXT,
    "blackUserId" TEXT NOT NULL,
    "blackModelVersionId" TEXT,
    "timeControl" TEXT NOT NULL DEFAULT '10+0',
    "result" TEXT,
    "winnerUserId" TEXT,
    "terminationReason" TEXT,
    "pgn" TEXT NOT NULL DEFAULT '',
    "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "moveHistory" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaChallenge" (
    "id" TEXT NOT NULL,
    "challengerUserId" TEXT NOT NULL,
    "challengerModelVersionId" TEXT,
    "opponentUserId" TEXT NOT NULL,
    "opponentModelVersionId" TEXT NOT NULL,
    "timeControl" TEXT NOT NULL DEFAULT '10+0',
    "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureGenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "FeatureGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "featureVersion" TEXT NOT NULL DEFAULT 'v1',
    "gamesTotal" INTEGER NOT NULL DEFAULT 0,
    "gamesProcessed" INTEGER NOT NULL DEFAULT 0,
    "positionsTotal" INTEGER NOT NULL DEFAULT 0,
    "positionsProcessed" INTEGER NOT NULL DEFAULT 0,
    "candidateRecordsGenerated" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureDataset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureVersion" TEXT NOT NULL DEFAULT 'v1',
    "gameCount" INTEGER NOT NULL DEFAULT 0,
    "positionCount" INTEGER NOT NULL DEFAULT 0,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRecord" (
    "id" TEXT NOT NULL,
    "featureDatasetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "candidateMove" TEXT NOT NULL,
    "isActualMove" BOOLEAN NOT NULL,
    "featureVersion" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "candidate" JSONB NOT NULL,
    "player" JSONB NOT NULL,
    "history" JSONB NOT NULL,
    "weakness" JSONB NOT NULL,
    "dna" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetGenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DatasetStatus" NOT NULL DEFAULT 'PENDING',
    "datasetType" "DatasetType" NOT NULL,
    "datasetVersion" TEXT NOT NULL DEFAULT 'v1',
    "featureVersion" TEXT NOT NULL,
    "targetVersion" TEXT NOT NULL DEFAULT 'v1',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "excludedRecords" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLDataset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetType" "DatasetType" NOT NULL,
    "version" TEXT NOT NULL,
    "featureVersion" TEXT NOT NULL,
    "targetVersion" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT 'v1',
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalPositions" INTEGER NOT NULL DEFAULT 0,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "trainRecords" INTEGER NOT NULL DEFAULT 0,
    "validationRecords" INTEGER NOT NULL DEFAULT 0,
    "testRecords" INTEGER NOT NULL DEFAULT 0,
    "excludedRecords" INTEGER NOT NULL DEFAULT 0,
    "status" "DatasetStatus" NOT NULL DEFAULT 'COMPLETED',
    "validationReport" JSONB,
    "statistics" JSONB,
    "exclusionReasons" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLDatasetRecord" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "split" TEXT NOT NULL,
    "candidateMove" TEXT NOT NULL,
    "actualMove" TEXT NOT NULL,
    "isActualMove" BOOLEAN NOT NULL,
    "isPeakTarget" BOOLEAN NOT NULL DEFAULT false,
    "peakScore" DOUBLE PRECISION,
    "features" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLDatasetRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "contextType" TEXT,
    "gameId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" TEXT NOT NULL,
    "cohortName" TEXT,
    "startGameDate" TIMESTAMP(3),
    "endGameDate" TIMESTAMP(3),
    "gamesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "positionsAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "sampleSizeDecisions" INTEGER NOT NULL DEFAULT 0,
    "avgCPL" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "medianCPL" DOUBLE PRECISION,
    "blunderRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "mistakeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "inaccuracyRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "engineTop1Rate" DOUBLE PRECISION,
    "engineTop3Rate" DOUBLE PRECISION,
    "avgEngineRank" DOUBLE PRECISION,
    "categoryMetrics" JSONB,
    "trainingPositionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "trainingPositionsSolved" INTEGER NOT NULL DEFAULT 0,
    "trainingSuccessRate" DOUBLE PRECISION,
    "weaknessMetrics" JSONB,
    "chessDNAVersion" INTEGER,
    "currentSelfModelVersion" INTEGER,
    "peakSelfModelVersion" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvolutionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelUpdateCandidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NO_UPDATE_NEEDED',
    "currentSelfActiveVersion" INTEGER NOT NULL DEFAULT 1,
    "peakSelfActiveVersion" INTEGER NOT NULL DEFAULT 1,
    "newGamesSinceLastTrain" INTEGER NOT NULL DEFAULT 0,
    "newPositionsSinceLastTrain" INTEGER NOT NULL DEFAULT 0,
    "dnaDivergence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "eligibilityReasons" JSONB,
    "candidateCurrentSelfVersion" INTEGER,
    "candidatePeakSelfVersion" INTEGER,
    "retrainingJobId" TEXT,
    "activationStatus" TEXT,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelUpdateCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelRetrainingJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'MANUAL',
    "eligibilityCandidateId" TEXT,
    "sourceGameCount" INTEGER NOT NULL DEFAULT 0,
    "sourceGameStart" TIMESTAMP(3),
    "sourceGameEnd" TIMESTAMP(3),
    "sourceDatasetVersion" TEXT NOT NULL DEFAULT 'v2',
    "featureVersion" TEXT NOT NULL DEFAULT 'v1',
    "trainingConfigVersion" TEXT NOT NULL DEFAULT 'v1',
    "currentModelVersion" INTEGER NOT NULL DEFAULT 1,
    "candidateCurrentSelfVersion" INTEGER,
    "candidatePeakSelfVersion" INTEGER,
    "currentSelfModelId" TEXT,
    "peakSelfModelId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT NOT NULL DEFAULT 'QUEUED',
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "currentGatePassed" BOOLEAN,
    "peakGatePassed" BOOLEAN,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "gateReport" JSONB,
    "failureReason" TEXT,
    "rejectionReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelRetrainingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "TrainingPosition_userId_weaknessCategory_idx" ON "TrainingPosition"("userId", "weaknessCategory");

-- CreateIndex
CREATE INDEX "TrainingPosition_trainingSessionId_idx" ON "TrainingPosition"("trainingSessionId");

-- CreateIndex
CREATE INDEX "TrainingAttempt_userId_attemptedAt_idx" ON "TrainingAttempt"("userId", "attemptedAt");

-- CreateIndex
CREATE INDEX "TrainingAttempt_trainingSessionId_idx" ON "TrainingAttempt"("trainingSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProgress_userId_key" ON "TrainingProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaModel_userId_modelType_key" ON "ArenaModel"("userId", "modelType");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaRating_userId_modelType_key" ON "ArenaRating"("userId", "modelType");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureDataset_userId_featureVersion_key" ON "FeatureDataset"("userId", "featureVersion");

-- CreateIndex
CREATE INDEX "FeatureRecord_userId_featureVersion_idx" ON "FeatureRecord"("userId", "featureVersion");

-- CreateIndex
CREATE INDEX "FeatureRecord_gameId_idx" ON "FeatureRecord"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureRecord_userId_positionId_candidateMove_featureVersio_key" ON "FeatureRecord"("userId", "positionId", "candidateMove", "featureVersion");

-- CreateIndex
CREATE UNIQUE INDEX "MLDataset_userId_datasetType_version_key" ON "MLDataset"("userId", "datasetType", "version");

-- CreateIndex
CREATE INDEX "MLDatasetRecord_datasetId_split_idx" ON "MLDatasetRecord"("datasetId", "split");

-- CreateIndex
CREATE INDEX "MLDatasetRecord_gameId_idx" ON "MLDatasetRecord"("gameId");

-- CreateIndex
CREATE INDEX "CoachConversation_userId_idx" ON "CoachConversation"("userId");

-- CreateIndex
CREATE INDEX "CoachMessage_conversationId_idx" ON "CoachMessage"("conversationId");

-- CreateIndex
CREATE INDEX "EvolutionSnapshot_userId_snapshotDate_idx" ON "EvolutionSnapshot"("userId", "snapshotDate");

-- CreateIndex
CREATE INDEX "EvolutionSnapshot_userId_sourceType_idx" ON "EvolutionSnapshot"("userId", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "ModelUpdateCandidate_userId_key" ON "ModelUpdateCandidate"("userId");

-- CreateIndex
CREATE INDEX "ModelUpdateCandidate_userId_status_idx" ON "ModelUpdateCandidate"("userId", "status");

-- CreateIndex
CREATE INDEX "ModelRetrainingJob_userId_status_idx" ON "ModelRetrainingJob"("userId", "status");

-- CreateIndex
CREATE INDEX "ModelRetrainingJob_userId_sourceDatasetVersion_currentModel_idx" ON "ModelRetrainingJob"("userId", "sourceDatasetVersion", "currentModelVersion");

-- CreateIndex
CREATE INDEX "MLModelVersion_userId_modelType_isActive_idx" ON "MLModelVersion"("userId", "modelType", "isActive");

-- CreateIndex
CREATE INDEX "MLModelVersion_userId_status_idx" ON "MLModelVersion"("userId", "status");

-- CreateIndex
CREATE INDEX "TrainingSession_userId_status_idx" ON "TrainingSession"("userId", "status");

-- AddForeignKey
ALTER TABLE "MLModelVersion" ADD CONSTRAINT "MLModelVersion_dependentModelVersionId_fkey" FOREIGN KEY ("dependentModelVersionId") REFERENCES "MLModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSession" ADD CONSTRAINT "TrainingSession_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPosition" ADD CONSTRAINT "TrainingPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPosition" ADD CONSTRAINT "TrainingPosition_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPosition" ADD CONSTRAINT "TrainingPosition_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_trainingPositionId_fkey" FOREIGN KEY ("trainingPositionId") REFERENCES "TrainingPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingProgress" ADD CONSTRAINT "TrainingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaModel" ADD CONSTRAINT "ArenaModel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ArenaProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaModel" ADD CONSTRAINT "ArenaModel_mlModelVersionId_fkey" FOREIGN KEY ("mlModelVersionId") REFERENCES "MLModelVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaRating" ADD CONSTRAINT "ArenaRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ArenaProfile"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_whiteUserId_fkey" FOREIGN KEY ("whiteUserId") REFERENCES "ArenaProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_blackUserId_fkey" FOREIGN KEY ("blackUserId") REFERENCES "ArenaProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_whiteModelVersionId_fkey" FOREIGN KEY ("whiteModelVersionId") REFERENCES "MLModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaMatch" ADD CONSTRAINT "ArenaMatch_blackModelVersionId_fkey" FOREIGN KEY ("blackModelVersionId") REFERENCES "MLModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaChallenge" ADD CONSTRAINT "ArenaChallenge_challengerUserId_fkey" FOREIGN KEY ("challengerUserId") REFERENCES "ArenaProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaChallenge" ADD CONSTRAINT "ArenaChallenge_opponentUserId_fkey" FOREIGN KEY ("opponentUserId") REFERENCES "ArenaProfile"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureGenerationJob" ADD CONSTRAINT "FeatureGenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureDataset" ADD CONSTRAINT "FeatureDataset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRecord" ADD CONSTRAINT "FeatureRecord_featureDatasetId_fkey" FOREIGN KEY ("featureDatasetId") REFERENCES "FeatureDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRecord" ADD CONSTRAINT "FeatureRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetGenerationJob" ADD CONSTRAINT "DatasetGenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLDataset" ADD CONSTRAINT "MLDataset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLDatasetRecord" ADD CONSTRAINT "MLDatasetRecord_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "MLDataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLDatasetRecord" ADD CONSTRAINT "MLDatasetRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachConversation" ADD CONSTRAINT "CoachConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CoachConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachMessage" ADD CONSTRAINT "CoachMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionSnapshot" ADD CONSTRAINT "EvolutionSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUpdateCandidate" ADD CONSTRAINT "ModelUpdateCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelRetrainingJob" ADD CONSTRAINT "ModelRetrainingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
