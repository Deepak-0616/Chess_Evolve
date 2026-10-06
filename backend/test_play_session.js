import { PrismaClient } from '@prisma/client';
import { PlaySessionManager } from './src/services/PlaySessionManager.js';
import { Chess } from 'chess.js';

const prisma = new PrismaClient();

async function runVerification() {
    console.log("=== STARTING PLAY SESSION VERIFICATION ===");
    
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log("No user found.");
        return;
    }
    console.log("User:", user.id);

    // 1. Current Self Session
    console.log("\n--- Testing Current Self Flow ---");
    let currentSelfSession;
    try {
        currentSelfSession = await PlaySessionManager.createSession(user.id, "CURRENT_SELF");
        console.log("Session Created:", currentSelfSession.id);
        console.log("Locked Model Version:", currentSelfSession.modelVersionId);
        
        // Play some moves
        const movesToPlay = ["e4", "e5", "Nf3"];
        for (const move of movesToPlay) {
            console.log(`Playing move: ${move}`);
            const res = await PlaySessionManager.playMove(currentSelfSession.id, user.id, move);
            console.log(`AI Response: ${res.aiMove} (Reason: ${res.reasoning})`);
        }
        
        // Resign
        const resResign = await PlaySessionManager.resignSession(currentSelfSession.id, user.id);
        console.log("Resigned Session Status:", resResign.status);
    } catch (e) {
        console.error("Current Self Error:", e);
    }

    // 2. Peak Self Session
    console.log("\n--- Testing Peak Self Flow ---");
    let peakSelfSession;
    try {
        peakSelfSession = await PlaySessionManager.createSession(user.id, "PEAK_SELF");
        console.log("Session Created:", peakSelfSession.id);
        console.log("Locked Model Version:", peakSelfSession.modelVersionId);
        
        // Play some moves
        const movesToPlay = ["d4", "d5", "c4"];
        for (const move of movesToPlay) {
            console.log(`Playing move: ${move}`);
            const res = await PlaySessionManager.playMove(peakSelfSession.id, user.id, move);
            console.log(`AI Response: ${res.aiMove} (Reason: ${res.reasoning})`);
        }
        
        // Finish
        const resResign = await PlaySessionManager.resignSession(peakSelfSession.id, user.id);
        console.log("Resigned Session Status:", resResign.status);
    } catch (e) {
        console.error("Peak Self Error:", e);
    }
    
    console.log("=== VERIFICATION COMPLETE ===");
}

runVerification().catch(console.error).finally(() => prisma.$disconnect());
