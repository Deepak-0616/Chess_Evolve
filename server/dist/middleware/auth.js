"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jwt_1 = require("../utils/jwt");
const apiResponse_1 = require("../utils/apiResponse");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return (0, apiResponse_1.sendError)(res, "AUTH_UNAUTHORIZED", "Missing or invalid authorization header.", 401);
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = (0, jwt_1.verifyToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, "AUTH_UNAUTHORIZED", "Invalid or expired token.", 401);
    }
}
