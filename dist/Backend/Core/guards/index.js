"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const requireAuth = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        res.status(401).json({ message: "Authorization header is required." });
        return;
    }
    next();
};
exports.requireAuth = requireAuth;
