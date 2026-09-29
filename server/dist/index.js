"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const auth_1 = __importDefault(require("./routes/auth"));
const chessProfile_1 = __importDefault(require("./routes/chessProfile"));
const sync_1 = __importDefault(require("./routes/sync"));
const games_1 = __importDefault(require("./routes/games"));
const dna_1 = __importDefault(require("./routes/dna"));
const peakSelf_1 = __importDefault(require("./routes/peakSelf"));
const play_1 = __importDefault(require("./routes/play"));
const training_1 = __importDefault(require("./routes/training"));
const coach_1 = __importDefault(require("./routes/coach"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const evolution_1 = __importDefault(require("./routes/evolution"));
const swagger_1 = require("./utils/swagger");
const apiResponse_1 = require("./utils/apiResponse");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({ origin: "*" }));
app.use(express_1.default.json({ limit: "10mb" }));
// OpenAPI Documentation
app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.openApiSpec));
// Versioned API Routes (/api/v1)
const v1 = express_1.default.Router();
v1.use("/auth", auth_1.default);
v1.use("/chess/profile", chessProfile_1.default);
v1.use("/chess/sync", sync_1.default);
v1.use("/games", games_1.default);
v1.use("/dna", dna_1.default);
v1.use("/peak-self", peakSelf_1.default);
v1.use("/play", play_1.default);
v1.use("/training", training_1.default);
v1.use("/coach", coach_1.default);
v1.use("/dashboard", dashboard_1.default);
v1.use("/evolution", evolution_1.default);
app.use("/api/v1", v1);
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});
// Fallback 404
app.use((req, res) => {
    (0, apiResponse_1.sendError)(res, "RESOURCE_NOT_FOUND", "The requested endpoint was not found.", 404);
});
// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    (0, apiResponse_1.sendError)(res, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.", 500);
});
app.listen(PORT, () => {
    console.log(`⚡ Chess Evolve API Server running on port ${PORT}`);
    console.log(`📖 OpenAPI Specs available at http://localhost:${PORT}/api/docs`);
});
