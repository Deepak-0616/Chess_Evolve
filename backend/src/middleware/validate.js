import { z } from "zod";

export const schemas = {
  uuid: z.string().uuid("Invalid UUID format"),
  
  chessUsername: z
    .string()
    .trim()
    .min(3, "Chess.com username must be at least 3 characters")
    .max(30, "Chess.com username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username contains invalid characters"),

  fen: z
    .string()
    .trim()
    .min(10, "FEN too short")
    .max(120, "FEN too long")
    .refine((val) => val.split(" ").length >= 2, "Invalid FEN structure"),

  move: z
    .string()
    .trim()
    .min(2, "Move notation too short")
    .max(10, "Move notation too long"),

  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),

  trainingSession: z.object({
    category: z.enum(["TACTICAL", "POSITIONAL", "ENDGAME", "CALCULATION"]).optional(),
    difficulty: z.enum(["Beginner", "Intermediate", "Advanced", "Master"]).optional(),
    targetWeakness: z.string().max(100).optional(),
    planId: z.string().optional(),
  }),

  attempt: z.object({
    positionId: z.string().min(1, "positionId is required"),
    move: z.string().min(2, "Valid move is required"),
    timeSpentMs: z.number().int().nonnegative().optional(),
  }),

  coachChat: z.object({
    message: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long"),
    conversationId: z.string().optional().nullable(),
    gameId: z.string().optional().nullable(),
  }),
};

export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const dataToValidate = source === "query" ? req.query : source === "params" ? req.params : req.body;
      const parsed = schema.parse(dataToValidate);
      if (source === "body") req.body = parsed;
      else if (source === "query") req.query = parsed;
      else if (source === "params") req.params = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Request payload failed schema validation",
            details: err.errors.map((e) => ({
              field: e.path.join("."),
              message: e.message,
            })),
          },
        });
      }
      return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Malformed request data" } });
    }
  };
}
