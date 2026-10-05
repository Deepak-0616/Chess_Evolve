import "dotenv/config";
import { prisma } from "./src/utils/prisma.js";
import axios from "axios";
import { MLServiceBridge } from "./src/services/ml/mlService.js";

const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function runMlTriggers() {
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users.`);

  for (const user of users) {
    const userId = user.id;
    console.log(`\n============================`);
    console.log(`Processing ML for user: ${userId}`);

    // 1. GENERATE FEATURES
    console.log(`Generating features in batches...`);
    let dataset = await prisma.featureDataset.findUnique({
      where: { userId_featureVersion: { userId, featureVersion: "v1" } }
    });
    if (!dataset) {
      dataset = await prisma.featureDataset.create({
        data: { userId, featureVersion: "v1" }
      });
    }

    const BATCH_SIZE = 500;
    let offset = 0;
    let totalGenerated = 0;

    while (true) {
      const positions = await prisma.positionAnalysis.findMany({
        where: { 
           game: { chessProfile: { userId } },
           NOT: { candidateMoves: { equals: [] } }
        },
        skip: offset,
        take: BATCH_SIZE,
        orderBy: { id: "asc" }
      });

      if (positions.length === 0) break;

      const payload = {
        feature_version: "v1",
        batch: positions.map(p => ({
          userId,
          gameId: p.gameId,
          positionId: p.id,
          moveNumber: p.moveNumber,
          fen: p.fen,
          gamePhase: p.gamePhase,
          actualMove: p.move,
          candidates: p.candidateMoves || []
        }))
      };

      try {
        const res = await axios.post(`${mlUrl}/api/v1/ml/features/generate`, payload, { timeout: 300000 });
        
        let created = 0;
        if (res.data.success && res.data.records) {
          const positionIds = Array.from(new Set(res.data.records.map(r => r.positionId)));
          await prisma.featureRecord.deleteMany({
            where: { userId, positionId: { in: positionIds }, featureVersion: "v1" }
          });
          
          const recordsToInsert = res.data.records.map(rec => ({
            featureDatasetId: dataset.id,
            userId,
            gameId: rec.gameId,
            positionId: rec.positionId,
            moveNumber: rec.moveNumber,
            candidateMove: rec.candidateMove,
            isActualMove: rec.isActualMove,
            featureVersion: "v1",
            position: rec.position,
            candidate: rec.candidate,
            player: rec.player,
            history: rec.history,
            weakness: rec.weakness
          }));
          
          await prisma.featureRecord.createMany({
            data: recordsToInsert,
            skipDuplicates: true
          });
          created += recordsToInsert.length;
        }
        totalGenerated += created;
        console.log(`Processed batch ${offset / BATCH_SIZE + 1}. Generated ${created} feature records.`);
      } catch (err) {
        console.error(`Error generating features at offset ${offset}:`, err.message);
      }
      
      offset += BATCH_SIZE;
    }

    await prisma.featureDataset.update({
      where: { id: dataset.id },
      data: { status: "COMPLETED", positionCount: totalGenerated }
    });

    console.log(`Completed feature generation. Total records: ${totalGenerated}`);

    // 2. GENERATE DATASETS
    console.log(`Generating ML Datasets (CURRENT_SELF and PEAK_SELF)...`);
    
    try {
        // Upsert Current Self Dataset
        let currentDataset = await prisma.mLDataset.findUnique({
          where: { userId_datasetType_version: { userId, datasetType: "CURRENT_SELF", version: "v1" } }
        });
        if (!currentDataset) {
          currentDataset = await prisma.mLDataset.create({
            data: { userId, datasetType: "CURRENT_SELF", version: "v1", featureVersion: "v1", targetVersion: "v1" }
          });
        }

        // Upsert Peak Self Dataset
        let peakDataset = await prisma.mLDataset.findUnique({
          where: { userId_datasetType_version: { userId, datasetType: "PEAK_SELF", version: "v1" } }
        });
        if (!peakDataset) {
          peakDataset = await prisma.mLDataset.create({
            data: { userId, datasetType: "PEAK_SELF", version: "v1", featureVersion: "v1", targetVersion: "v1" }
          });
        }

        // Insert MLDatasetRecords
        let currentGames = new Set();
        let currentPos = 0;
        let peakGames = new Set();
        let peakPos = 0;
        
        let dsOffset = 0;
        while(true) {
          const posBatch = await prisma.featureRecord.findMany({
              where: { userId, featureVersion: "v1" },
              select: { positionId: true },
              distinct: ["positionId"],
              skip: dsOffset,
              take: 500,
              orderBy: { positionId: "asc" }
          });
          
          if (posBatch.length === 0) break;
          
          const posIds = posBatch.map(p => p.positionId);
          const featureRecords = await prisma.featureRecord.findMany({
              where: { userId, featureVersion: "v1", positionId: { in: posIds } }
          });
          
          const batchMap = new Map();
          for (const fr of featureRecords) {
             if (!batchMap.has(fr.positionId)) batchMap.set(fr.positionId, []);
             batchMap.get(fr.positionId).push(fr);
          }
          
          const batchPayload = [];
          for (const [pid, frs] of batchMap.entries()) {
             const actualFr = frs.find(f => f.isActualMove);
             const actualMove = actualFr ? actualFr.candidateMove : (frs[0] ? frs[0].candidateMove : "");
             const split = Math.random() < 0.7 ? "TRAIN" : (Math.random() < 0.5 ? "VALIDATION" : "TEST");
             
             for (const fr of frs) {
                batchPayload.push({
                    userId: fr.userId,
                    gameId: fr.gameId,
                    positionId: fr.positionId,
                    moveNumber: fr.moveNumber,
                    actualMove: actualMove,
                    candidateMove: fr.candidateMove,
                    isActualMove: fr.isActualMove,
                    position: fr.position,
                    player: fr.player,
                    weakness: fr.weakness,
                    candidate: fr.candidate,
                    history: fr.history,
                    dna: fr.dna,
                    split: split
                });
             }
          }

          const datasetPayload = {
            featureVersion: "v1",
            datasetVersion: "v1",
            generateCurrentSelf: true,
            generatePeakSelf: true,
            batch: batchPayload
          };
          
          const res = await axios.post(`${mlUrl}/api/v1/ml/datasets/generate`, datasetPayload, { timeout: 600000 });
          if (res.data.success && res.data.records) {
             const dsRecordsToInsert = res.data.records.map(rec => {
               const dsId = rec.datasetType === "CURRENT_SELF" ? currentDataset.id : peakDataset.id;
               if (rec.datasetType === "CURRENT_SELF") {
                  currentGames.add(rec.gameId);
                  currentPos++;
               } else {
                  peakGames.add(rec.gameId);
                  peakPos++;
               }
               return {
                 datasetId: dsId,
                 userId,
                 gameId: rec.gameId,
                 positionId: rec.positionId,
                 moveNumber: rec.moveNumber,
                 split: rec.split,
                 candidateMove: rec.candidateMove,
                 actualMove: rec.actualMove,
                 isActualMove: rec.isActualMove,
                 isPeakTarget: rec.isPeakTarget || false,
                 peakScore: rec.peakScore || null,
                 features: rec.features || {},
                 metadata: rec.metadata || {}
               };
             });

             if (dsRecordsToInsert.length > 0) {
               await prisma.mLDatasetRecord.deleteMany({
                 where: { datasetId: { in: [currentDataset.id, peakDataset.id] }, positionId: { in: posIds } }
               });
               
               await prisma.mLDatasetRecord.createMany({
                 data: dsRecordsToInsert,
                 skipDuplicates: true
               });
             }
          }
          dsOffset += 500;
        }

        await prisma.mLDataset.update({
          where: { id: currentDataset.id },
          data: { totalGames: currentGames.size, totalPositions: currentPos }
        });
        await prisma.mLDataset.update({
          where: { id: peakDataset.id },
          data: { totalGames: peakGames.size, totalPositions: peakPos }
        });

        console.log(`Datasets generated successfully. Current: ${currentPos} pos. Peak: ${peakPos} pos.`);
    } catch (err) {
      console.error("Error generating datasets:", err.message);
    }

    // 3. TRIGGER ML TRAINING
    console.log(`Triggering ML Training (CURRENT_SELF)...`);
    try {
      await MLServiceBridge.triggerModelTraining(userId, "CURRENT_SELF");
      console.log(`Current Self training triggered!`);
    } catch (err) {
       console.error(`ML Trigger failed for CURRENT_SELF:`, err);
    }

    // Give Current Self a bit of time to queue up before Peak Self
    await new Promise(r => setTimeout(r, 2000));

    console.log(`Triggering ML Training (PEAK_SELF)...`);
    try {
      await MLServiceBridge.triggerModelTraining(userId, "PEAK_SELF");
      console.log(`Peak Self training triggered!`);
    } catch (err) {
       console.error(`ML Trigger failed for PEAK_SELF:`, err);
    }
  }

  console.log("\nAll ML tasks triggered. Check FastAPI logs for training progress.");
}

runMlTriggers().then(() => {
  prisma.$disconnect();
  process.exit(0);
});
