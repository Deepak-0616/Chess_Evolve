import { Chess } from "chess.js";

export class PgnParser {
  static parseChessComGame(rawGame, targetUsername) {
    if (!rawGame.pgn) return null;

    try {
      const chess = new Chess();
      try {
        chess.loadPgn(rawGame.pgn, { strict: false });
      } catch (e) {
        chess.loadPgn(rawGame.pgn);
      }
      const headers = chess.header();

      const whiteUser = (rawGame.white?.username || headers["White"] || "White").trim();
      const blackUser = (rawGame.black?.username || headers["Black"] || "Black").trim();

      const normalizedTarget = targetUsername.trim().toLowerCase();
      const isWhite = whiteUser.toLowerCase() === normalizedTarget;
      const isBlack = blackUser.toLowerCase() === normalizedTarget;

      if (!isWhite && !isBlack) {
        // Game does not involve target username
        return null;
      }

      const playerColor = isWhite ? "WHITE" : "BLACK";

      const whiteRating = rawGame.white?.rating || (headers["WhiteElo"] ? parseInt(headers["WhiteElo"], 10) : undefined);
      const blackRating = rawGame.black?.rating || (headers["BlackElo"] ? parseInt(headers["BlackElo"], 10) : undefined);

      const playerRating = isWhite ? whiteRating : blackRating;
      const opponentRating = isWhite ? blackRating : whiteRating;

      let result = headers["Result"] || "*";
      if (rawGame.white?.result && rawGame.black?.result) {
        if (rawGame.white.result === "win") result = "1-0";
        else if (rawGame.black.result === "win") result = "0-1";
        else result = "1/2-1/2";
      }

      // External unique ID
      const externalId = rawGame.url || rawGame.uuid || `game_${rawGame.end_time}_${whiteUser}_${blackUser}`;

      // Date parsing
      let playedAt;
      if (rawGame.end_time) {
        playedAt = new Date(rawGame.end_time * 1000);
      } else if (headers["Date"]) {
        const dateStr = headers["Date"].replace(/\./g, "-");
        playedAt = new Date(dateStr);
      }

      // ECO and Opening
      const eco = headers["ECO"] || undefined;
      let openingName = headers["Opening"];

      if (!openingName) {
        const ecoUrl = rawGame.eco || headers["ECOUrl"];
        if (ecoUrl && typeof ecoUrl === "string") {
          const parts = ecoUrl.split("/openings/");
          if (parts[1]) {
            openingName = decodeURIComponent(parts[1]).replace(/-/g, " ");
          }
        }
      }

      if (!openingName && headers["ECO"]) {
        openingName = `ECO ${headers["ECO"]}`;
      }

      // Official accuracy from Chess.com PGN headers if available
      let officialAccuracy;
      if (isWhite && headers["WhiteAccuracy"]) {
        officialAccuracy = parseFloat(headers["WhiteAccuracy"]);
      } else if (!isWhite && headers["BlackAccuracy"]) {
        officialAccuracy = parseFloat(headers["BlackAccuracy"]);
      } else if (headers["Accuracy"]) {
        officialAccuracy = parseFloat(headers["Accuracy"]);
      }

      // Moves extraction
      const history = chess.history({ verbose: true });
      const moves = history.map((moveObj, index) => ({
        ply: index + 1,
        moveNumber: Math.floor(index / 2) + 1,
        san: moveObj.san,
        uci: `${moveObj.from}${moveObj.to}${moveObj.promotion || ""}`,
        fen: moveObj.after,
      }));

      return {
        externalId,
        white: whiteUser,
        black: blackUser,
        result,
        playerColor,
        playerRating: playerRating ? Number(playerRating) : undefined,
        opponentRating: opponentRating ? Number(opponentRating) : undefined,
        timeControl: rawGame.time_control || headers["TimeControl"] || undefined,
        eco: eco || undefined,
        openingName: openingName || undefined,
        accuracy: officialAccuracy && !isNaN(officialAccuracy) ? Number(officialAccuracy.toFixed(1)) : undefined,
        pgn: rawGame.pgn,
        playedAt: playedAt && !isNaN(playedAt.getTime()) ? playedAt : new Date(),
        moves,
      };
    } catch (err) {
      console.warn("Error parsing PGN:", err);
      return null;
    }
  }
}
