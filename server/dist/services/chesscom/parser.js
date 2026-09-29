"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgnParser = void 0;
const chess_js_1 = require("chess.js");
class PgnParser {
    static parseChessComGame(rawGame, targetUsername) {
        if (!rawGame.pgn)
            return null;
        try {
            const chess = new chess_js_1.Chess();
            chess.loadPgn(rawGame.pgn);
            const headers = chess.header();
            const whiteUser = (rawGame.white?.username || headers["White"] || "White").trim();
            const blackUser = (rawGame.black?.username || headers["Black"] || "Black").trim();
            const normalizedTarget = targetUsername.trim().toLowerCase();
            const isWhite = whiteUser.toLowerCase() === normalizedTarget;
            const playerColor = isWhite ? "WHITE" : "BLACK";
            const playerRating = isWhite ? rawGame.white?.rating : rawGame.black?.rating;
            const opponentRating = isWhite ? rawGame.black?.rating : rawGame.white?.rating;
            let result = headers["Result"] || "*";
            if (rawGame.white?.result && rawGame.black?.result) {
                if (rawGame.white.result === "win")
                    result = "1-0";
                else if (rawGame.black.result === "win")
                    result = "0-1";
                else
                    result = "1/2-1/2";
            }
            // External unique ID
            const externalId = rawGame.url || rawGame.uuid || `game_${rawGame.end_time}_${whiteUser}_${blackUser}`;
            // Date parsing
            let playedAt;
            if (rawGame.end_time) {
                playedAt = new Date(rawGame.end_time * 1000);
            }
            else if (headers["Date"]) {
                const dateStr = headers["Date"].replace(/\./g, "-");
                playedAt = new Date(dateStr);
            }
            // ECO and Opening
            const eco = headers["ECO"] || undefined;
            const openingName = headers["Opening"] || headers["Event"] || undefined;
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
                pgn: rawGame.pgn,
                playedAt: playedAt && !isNaN(playedAt.getTime()) ? playedAt : new Date(),
                moves,
            };
        }
        catch (err) {
            console.warn("Error parsing PGN:", err);
            return null;
        }
    }
}
exports.PgnParser = PgnParser;
