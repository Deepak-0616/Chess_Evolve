import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "chess_evolve_default_jwt_secret_key";

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
