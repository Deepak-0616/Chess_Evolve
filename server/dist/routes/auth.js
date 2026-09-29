"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    displayName: zod_1.z.string().min(2),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
router.post("/register", async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Invalid registration payload", 400, result.error.format());
    }
    const { email, password, displayName } = result.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return (0, apiResponse_1.sendError)(res, "EMAIL_IN_USE", "A user with this email already exists.", 400);
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            displayName,
        },
    });
    const accessToken = (0, jwt_1.generateToken)({ userId: user.id, email: user.email });
    return (0, apiResponse_1.sendSuccess)(res, {
        user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
        },
        accessToken,
    }, 201);
});
router.post("/login", async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        return (0, apiResponse_1.sendError)(res, "VALIDATION_ERROR", "Invalid login payload", 400, result.error.format());
    }
    const { email, password } = result.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return (0, apiResponse_1.sendError)(res, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid) {
        return (0, apiResponse_1.sendError)(res, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }
    const accessToken = (0, jwt_1.generateToken)({ userId: user.id, email: user.email });
    return (0, apiResponse_1.sendSuccess)(res, {
        user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
        },
        accessToken,
    });
});
router.get("/me", auth_1.authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
            id: true,
            email: true,
            displayName: true,
            createdAt: true,
            chessProfile: true,
        },
    });
    if (!user) {
        return (0, apiResponse_1.sendError)(res, "AUTH_UNAUTHORIZED", "User not found.", 404);
    }
    return (0, apiResponse_1.sendSuccess)(res, user);
});
exports.default = router;
