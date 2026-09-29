import { verifyToken } from "../utils/jwt.js";
import { sendError } from "../utils/apiResponse.js";

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "AUTH_UNAUTHORIZED", "Missing or invalid authorization header.", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return sendError(res, "AUTH_UNAUTHORIZED", "Invalid or expired token.", 401);
  }
}
