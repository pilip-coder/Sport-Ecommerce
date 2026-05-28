"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.AppError = void 0;
const environment_1 = require("../../Config/environment");
class AppError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
const notFoundHandler = (_req, res) => {
    res.status(404).json({ message: "Route not found." });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, _req, res, _next) => {
    if (error instanceof AppError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    console.error(error);
    if (environment_1.environment.nodeEnv !== "production") {
        res.status(500).json({
            message: "Internal server error.",
            error: error.message,
        });
        return;
    }
    res.status(500).json({ message: "Internal server error." });
};
exports.errorHandler = errorHandler;
