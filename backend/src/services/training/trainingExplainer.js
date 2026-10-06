/**
 * Deterministic explanation generator comparing player move,
 * historical decision, Current Self, Peak Self, and Stockfish engine choice.
 */
export class TrainingExplainer {
  /**
   * Generate structured, verified explanation for a training attempt
   */
  static generateExplanation({
    submittedMove,
    targetMove,
    quality,
    engineRank,
    cpLoss,
    playerHistoricalMove,
    playerHistoricalClass,
    currentSelfMove,
    currentSelfConfidence,
    peakSelfMove,
    peakSelfConfidence,
    category,
    fen
  }) {
    const lines = [];

    // 1. Move Quality Assessment
    if (quality === "BEST" || submittedMove === targetMove) {
      lines.push(`Outstanding move! ${submittedMove} is the engine-recommended best move.`);
    } else if (quality === "EXCELLENT" || engineRank === 2) {
      lines.push(`Strong continuation. ${submittedMove} is the #2 engine move, within ${Math.round(cpLoss || 10)} cp of best.`);
    } else if (quality === "GOOD" || (cpLoss && cpLoss < 50)) {
      lines.push(`A solid alternative, though ${targetMove} retains a cleaner tactical advantage.`);
    } else if (quality === "INACCURACY") {
      lines.push(`${submittedMove} is an inaccuracy (loss of ~${Math.round(cpLoss || 60)} cp). The engine preferred ${targetMove}.`);
    } else if (quality === "MISTAKE") {
      lines.push(`${submittedMove} concedes significant initiative (-${Math.round(cpLoss || 150)} cp). ${targetMove} was essential.`);
    } else {
      lines.push(`${submittedMove} is a critical tactical blunder. It hands decisive advantage to the opponent.`);
    }

    // 2. Historical Context (from the actual game)
    if (playerHistoricalMove) {
      if (submittedMove === playerHistoricalMove) {
        lines.push(`Note: You made this exact move (${playerHistoricalMove}) in your original game, which was evaluated as a ${playerHistoricalClass || "mistake"}.`);
      } else if (quality === "BEST" || quality === "EXCELLENT") {
        lines.push(`In your actual game, you played ${playerHistoricalMove} (${playerHistoricalClass || "mistake"}). Your training move ${submittedMove} is a direct improvement!`);
      } else {
        lines.push(`In your game you played ${playerHistoricalMove}. Both this and your submitted move miss the best response ${targetMove}.`);
      }
    }

    // 3. Current Self Model Insight
    if (currentSelfMove) {
      const csConf = currentSelfConfidence ? ` (${Math.round(currentSelfConfidence * 100)}% style confidence)` : "";
      if (currentSelfMove === playerHistoricalMove) {
        lines.push(`Your Current Self model predicts you instinctively gravitate toward ${currentSelfMove}${csConf}, reflecting your established playing habit.`);
      } else {
        lines.push(`Your Current Self model predicted ${currentSelfMove}${csConf}.`);
      }
    }

    // 4. Peak Self Model Comparison
    if (peakSelfMove) {
      const psConf = peakSelfConfidence ? ` (${Math.round(peakSelfConfidence * 100)}% confidence)` : "";
      if (peakSelfMove === targetMove) {
        lines.push(`Your Peak Self model successfully found the best continuation ${peakSelfMove}${psConf}, correcting the habitual pattern.`);
      } else if (peakSelfMove !== currentSelfMove) {
        lines.push(`Your Peak Self model diverged from Current Self: recommending ${peakSelfMove}${psConf} instead of ${currentSelfMove || "historical move"}, optimizing tactical discipline.`);
      } else {
        lines.push(`Peak Self selected ${peakSelfMove}${psConf}.`);
      }
    }

    // 5. Categorical Focus Advice
    if (category === "TACTICAL") {
      lines.push("Focus: In sharp tactical middlegames, calculate forcing checks, captures, and counter-threats before executing intuitive moves.");
    } else if (category === "DEFENSIVE") {
      lines.push("Focus: Under pressure or king threats, evaluate defensive piece coordination and ensure flight squares before counter-attacking.");
    } else if (category === "POSITIONAL") {
      lines.push("Focus: In quiet positions, avoid unnecessary pawn weaknesses and prioritize active piece placement over premature simplifications.");
    } else if (category === "ENDGAME") {
      lines.push("Focus: Endgame precision requires active king participation and calculating pawn promotion races carefully.");
    }

    return lines.join("\n\n");
  }

  /**
   * Determine move quality label from CP loss and engine rank
   */
  static determineMoveQuality(engineRank, cpLoss) {
    if (engineRank === 1 || (cpLoss !== null && cpLoss <= 15)) return "BEST";
    if (engineRank === 2 || (cpLoss !== null && cpLoss <= 45)) return "EXCELLENT";
    if (engineRank === 3 || (cpLoss !== null && cpLoss <= 90)) return "GOOD";
    if (cpLoss !== null && cpLoss <= 160) return "INACCURACY";
    if (cpLoss !== null && cpLoss <= 280) return "MISTAKE";
    return "BLUNDER";
  }
}
