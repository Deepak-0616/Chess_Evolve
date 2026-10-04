import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { generateToken } from "../utils/jwt.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid registration payload", 400, result.error.format());
  }

  const { email, password, displayName } = result.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return sendError(res, "EMAIL_IN_USE", "A user with this email already exists.", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
    },
    include: {
      chessProfile: true
    }
  });

  const accessToken = generateToken({ id: user.id, email: user.email });

  return sendSuccess(
    res,
    {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        chessProfile: user.chessProfile
      },
      accessToken,
    },
    201
  );
});

router.post("/login", async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return sendError(res, "VALIDATION_ERROR", "Invalid login payload", 400, result.error.format());
  }

  const { email, password } = result.data;
  const user = await prisma.user.findUnique({ 
    where: { email },
    include: { chessProfile: true }
  });

  if (!user) {
    return sendError(res, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  if (user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return sendError(res, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.", 401);
    }
  }

  const accessToken = generateToken({ id: user.id, email: user.email });

  return sendSuccess(res, {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      chessProfile: user.chessProfile
    },
    accessToken,
  });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      chessProfile: true,
    },
  });

  if (!user) {
    return sendError(res, "AUTH_UNAUTHORIZED", "User not found.", 404);
  }

  return sendSuccess(res, user);
});

router.post("/logout", authenticate, (req, res) => {
  return sendSuccess(res, { message: "Logged out successfully" });
});

export default router;
