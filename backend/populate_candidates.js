import "dotenv/config";
import { prisma } from "./src/utils/prisma.js";
import { spawn } from "child_process";

const CONCURRENCY = 30;

class PersistentEngine {
  constructor() {
    this.sf = spawn(process.env.STOCKFISH_PATH);
    this.queue = [];
    this.isProcessing = false;
    this.sf.stdout.on("data", this.onData.bind(this));
    
    this.currentResolver = null;
    this.currentCandidates = [];
    this.isDone = false;
  }

  onData(data) {
    if (this.isDone || !this.currentResolver) return;
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.includes("multipv") && line.includes(" score ")) {
        const moveMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
        const cpMatch = line.match(/score cp (-?\d+)/);
        const mateMatch = line.match(/score mate (-?\d+)/);
        const pvMatch = line.match(/multipv (\d+)/);
        
        if (moveMatch && pvMatch) {
          const move = moveMatch[1];
          const rank = parseInt(pvMatch[1], 10);
          let score = 0;
          if (cpMatch) {
             score = parseInt(cpMatch[1], 10) / 100.0;
          } else if (mateMatch) {
             const m = parseInt(mateMatch[1], 10);
             score = m > 0 ? 100.0 - m : -100.0 - m;
          }
          this.currentCandidates[rank - 1] = { move, score, rank };
        }
      } else if (line.startsWith("bestmove")) {
        this.isDone = true;
        this.currentResolver(this.currentCandidates.filter(Boolean));
        this.currentResolver = null;
        this.isProcessing = false;
        this.processNext();
        break;
      }
    }
  }

  evaluate(fen, depth, multiPv) {
    return new Promise(resolve => {
      this.queue.push({ fen, depth, multiPv, resolve });
      this.processNext();
    });
  }

  processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    this.isDone = false;
    this.currentCandidates = [];
    
    const task = this.queue.shift();
    this.currentResolver = task.resolve;
    
    this.sf.stdin.write(`setoption name MultiPV value ${task.multiPv}\n`);
    this.sf.stdin.write(`position fen ${task.fen}\n`);
    this.sf.stdin.write(`go depth ${task.depth}\n`);
  }
}

async function run() {
  console.log("Fetching positions that lack candidate moves...");
  
  const positions = await prisma.positionAnalysis.findMany({
    where: { candidateMoves: { equals: [] } },
    select: { id: true, fen: true }
  });

  console.log(`Found ${positions.length} positions without candidates.`);

  let index = 0;
  let updated = 0;
  let lastReportTime = Date.now();
  
  const worker = async (workerId) => {
    const engine = new PersistentEngine();
    
    while (index < positions.length) {
      const pos = positions[index++];
      if (index % 1000 === 0 || Date.now() - lastReportTime > 2000) {
        console.log(`Progress: ${index}/${positions.length} - Updated: ${updated}`);
        lastReportTime = Date.now();
      }
      
      try {
        // Run with depth 1 to speed up analysis since we only need *some* real candidates
        const cands = await engine.evaluate(pos.fen, 1, 5);
        if (cands && cands.length > 0) {
          await prisma.positionAnalysis.update({
            where: { id: pos.id },
            data: { candidateMoves: cands }
          });
          updated++;
        }
      } catch (err) {
        console.error(`Error on position ${pos.id}:`, err.message);
      }
    }
    
    engine.sf.kill();
  };

  const pool = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    pool.push(worker(i));
  }
  
  await Promise.all(pool);
  console.log(`Finished. Updated ${updated} positions.`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
