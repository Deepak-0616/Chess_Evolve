"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, statusCode = 200, meta) {
    return res.status(statusCode).json({
        success: true,
        data,
        meta: meta || {},
    });
}
function sendError(res, code, message, statusCode = 400, details) {
    return res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details: details || {},
        },
        meta: {},
    });
}
