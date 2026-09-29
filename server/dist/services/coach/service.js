"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachService = void 0;
const client_1 = require("@prisma/client");
const service_1 = require("../dna/service");
const prisma = new client_1.PrismaClient();
class CoachService {
    static async askCoach(userId, message, conversationId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                chessProfile: true,
                games: { take: 50, orderBy: { playedAt: "desc" } },
            },
        });
        const dna = await service_1.ChessDNAService.getCurrentDNA(userId);
        const convId = conversationId || `conv_${Date.now()}`;
        const queryLower = message.toLowerCase();
        // Check if OPENAI_API_KEY is set
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey && apiKey.trim().length > 10) {
            try {
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey.trim()}`,
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "system",
                                content: `You are the Chess Evolve Personal AI Coach. You speak directly to the player about their actual Chess DNA and game performance.
Data context:
- Username: ${user?.chessProfile?.username || "Player"}
- Games Analyzed: ${dna.gamesAnalyzed}
- DNA Metrics: ${JSON.stringify(dna.metrics)}
- Identified Strengths: ${JSON.stringify(dna.strengths)}
- Identified Weaknesses: ${JSON.stringify(dna.weaknesses)}
Rule: Never invent stats. Base all advice strictly on the metrics above. Keep answers concise, direct, and actionable.`,
                            },
                            { role: "user", content: message },
                        ],
                        temperature: 0.5,
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const answer = data.choices[0]?.message?.content;
                    if (answer) {
                        return {
                            conversationId: convId,
                            answer,
                            sources: {
                                gameCount: dna.gamesAnalyzed,
                                dnaVersion: dna.version,
                            },
                        };
                    }
                }
            }
            catch (err) {
                console.warn("OpenAI API call error, falling back to deterministic coach service:", err);
            }
        }
        // Deterministic intelligence fallback based on real metrics
        let answer = "";
        if (queryLower.includes("weakness") || queryLower.includes("flaw") || queryLower.includes("mistake")) {
            const topW = dna.weaknesses[0];
            answer = `Based on your ${dna.gamesAnalyzed} analyzed games (DNA v${dna.version}), your primary weakness is ${topW ? topW.name : "tactical calculation under pressure"}. ${topW ? topW.description : ""} We have generated targeted exercises in your Training tab to help you eliminate this pattern.`;
        }
        else if (queryLower.includes("opening") || queryLower.includes("white") || queryLower.includes("black")) {
            answer = `Looking at your recent games, you achieve high aggression and initiative with e4 systems (e.g. Sicilian/King's Pawn). Your tactical preference is ${dna.metrics.tacticalPreference}%, which works best when you complete piece development before launching attacks.`;
        }
        else if (queryLower.includes("endgame") || queryLower.includes("conversion")) {
            answer = `Your current Endgame Ability metric stands at ${dna.metrics.endgameAbility}%. ${dna.metrics.endgameAbility > 65
                ? "You show solid pawn structure conversion when piece counts simplify."
                : "You tend to rush pawn trades in even endgames. Focus on king activity in the endgame."}`;
        }
        else if (queryLower.includes("style") || queryLower.includes("dna") || queryLower.includes("play")) {
            answer = `Your Chess DNA profile (v${dna.version}) shows an Aggression score of ${dna.metrics.aggression}%, Tactical Preference of ${dna.metrics.tacticalPreference}%, and Positional score of ${dna.metrics.positionalPreference}%. You play an energetic, attack-oriented game.`;
        }
        else {
            answer = `Welcome, ${user?.displayName || "Player"}. In your latest ${dna.gamesAnalyzed} analyzed games, your top strength is ${dna.strengths[0]?.name || "Tactical vision"} (${dna.strengths[0]?.score || 85}%), and your top priority is improving ${dna.weaknesses[0]?.name || "Defensive positions"}. What specific area would you like to review today?`;
        }
        return {
            conversationId: convId,
            answer,
            sources: {
                gameCount: dna.gamesAnalyzed,
                dnaVersion: dna.version,
            },
        };
    }
}
exports.CoachService = CoachService;
