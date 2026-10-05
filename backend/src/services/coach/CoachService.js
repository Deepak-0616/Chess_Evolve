import { prisma } from "../../utils/prisma.js";
import { CoachContextBuilder } from "./CoachContextBuilder.js";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are Chess Evolve Coach.
Your purpose is to provide evidence-based, personalized chess coaching.
You have access only to the structured context provided to you.
Never invent games, moves, statistics, ratings, weaknesses, DNA values, model results, or player behavior.
If evidence is insufficient, explicitly say so.
Distinguish between FACT, INFERENCE, and RECOMMENDATION.
Do not claim a player has a weakness based on one isolated move unless the data explicitly supports that conclusion. Prefer recurring evidence.
When discussing a specific game: reference the actual game and move.
When discussing Current Self: explain how the model represents historical behavior.
When discussing Peak Self: explain it as a stronger version of the player's style, not as a perfect engine. Do not claim Peak Self is perfect.
Stockfish is an analysis/reference engine, not the player's personalized identity.
Return responses in standard Markdown format.`;

export class CoachService {
  /**
   * Internal helper to call OpenAI API directly using fetch.
   */
  static async callOpenAI(messages) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured.");
    }

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 800,
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      throw new Error(`OpenAI API failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  static async handleChat(userId, message, conversationId = null, gameId = null) {
    // 1. Context Generation
    let contextData;
    let contextType = "GENERAL";

    if (gameId) {
      contextData = await CoachContextBuilder.buildGameReviewContext(userId, gameId);
      contextType = "GAME_REVIEW";
    } else {
      contextData = await CoachContextBuilder.buildGeneralContext(userId);
    }

    // 2. Fetch/Create Conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.coachConversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation || conversation.userId !== userId) {
        throw new Error("Conversation not found or access denied.");
      }
    } else {
      conversation = await prisma.coachConversation.create({
        data: {
          userId,
          title: message.substring(0, 40) + "...",
          contextType,
          gameId,
        }
      });
    }

    // 3. Save User Message
    await prisma.coachMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        role: "user",
        content: message,
      }
    });

    // 4. Retrieve History (Last 5 messages for context window)
    const history = await prisma.coachMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // 5. Build LLM Messages array
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `CURRENT PLAYER CONTEXT (JSON):\n${JSON.stringify(contextData, null, 2)}` }
    ];

    for (const msg of history) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      });
    }

    // 6. Call OpenAI
    let aiResponse;
    try {
      aiResponse = await CoachService.callOpenAI(messages);
    } catch (e) {
      aiResponse = "I'm currently unable to reach my analysis engine. Please try again later. (Error: " + e.message + ")";
    }

    // 7. Save Assistant Message
    const assistantMsg = await prisma.coachMessage.create({
      data: {
        conversationId: conversation.id,
        userId,
        role: "assistant",
        content: aiResponse,
      }
    });

    return {
      conversationId: conversation.id,
      response: aiResponse,
      messageId: assistantMsg.id,
    };
  }

  static async getInsights(userId) {
    const contextData = await CoachContextBuilder.buildGeneralContext(userId);
    
    // Check if we have enough data
    if (contextData.player.gamesAnalyzed < 5) {
      return {
        insights: [],
        message: "You need more analyzed games (at least 5) before I can confidently detect recurring weaknesses."
      };
    }

    // Here we can ask the LLM to just generate a JSON array of insights based on the context.
    const prompt = `Based on the provided player context, generate 3-5 specific, evidence-based insights. 
Return ONLY valid JSON in this format: 
{ "insights": [ { "category": "TACTICAL|POSITIONAL|OPENING|ENDGAME", "severity": "HIGH|MEDIUM|LOW", "confidence": 0.85, "evidenceCount": 10, "summary": "...", "recommendation": "..." } ] }
Do NOT hallucinate values. Derive confidence from the number of games and consistency of the weakness.`;

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `CURRENT PLAYER CONTEXT (JSON):\n${JSON.stringify(contextData, null, 2)}` },
      { role: "user", content: prompt }
    ];

    try {
      let aiResponse = await CoachService.callOpenAI(messages);
      // clean markdown block if present
      aiResponse = aiResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsed = JSON.parse(aiResponse);
      return parsed;
    } catch (e) {
      console.error(e);
      return { insights: [], error: "Failed to generate insights: " + e.message };
    }
  }
}
