"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = exports.requireAuth = void 0;
const node_crypto_1 = require("node:crypto");
const environment_1 = require("../../Config/environment");
const errors_1 = require("../errors");
const auth_repository_1 = require("../../Repositories/auth.repository");
const decodeBase64Url = (value) => {
    return Buffer.from(value, "base64url").toString("utf8");
};
const parseBearerToken = (authorization) => {
    if (!authorization) {
        throw new errors_1.AppError("Authorization header is required.", 401);
    }
    const [scheme, token] = authorization.split(" ");
    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
        throw new errors_1.AppError("Authorization must use Bearer token.", 401);
    }
    return token;
};
const verifyToken = (token) => {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) {
        throw new errors_1.AppError("Invalid access token format.", 401);
    }
    const expectedSignature = (0, node_crypto_1.createHmac)("sha256", environment_1.environment.jwtSecret)
        .update(`${header}.${payload}`)
        .digest("base64url");
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (providedBuffer.length !== expectedBuffer.length
        || !(0, node_crypto_1.timingSafeEqual)(providedBuffer, expectedBuffer)) {
        throw new errors_1.AppError("Invalid access token signature.", 401);
    }
    let parsed;
    try {
        parsed = JSON.parse(decodeBase64Url(payload));
    }
    catch {
        throw new errors_1.AppError("Invalid access token payload.", 401);
    }
    if (!parsed.sub || !parsed.email || !parsed.role || !parsed.jti || !parsed.exp) {
        throw new errors_1.AppError("Access token is missing required claims.", 401);
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (parsed.exp <= nowSeconds) {
        throw new errors_1.AppError("Access token has expired.", 401);
    }
    const userId = Number(parsed.sub);
    if (!Number.isInteger(userId) || userId < 1) {
        throw new errors_1.AppError("Invalid access token subject.", 401);
    }
    if (typeof parsed.jti !== "string" || parsed.jti.trim().length < 8) {
        throw new errors_1.AppError("Invalid access token session.", 401);
    }
    return parsed;
};
const requireAuth = async (req, res, next) => {
    try {
        const token = parseBearerToken(req.headers.authorization);
        const payload = verifyToken(token);
        const userId = Number(payload.sub);
        const sessionActive = await (0, auth_repository_1.isAuthSessionActive)(userId, payload.jti);
        if (!sessionActive) {
            throw new errors_1.AppError("Session has been revoked. Please login again.", 401);
        }
        req.authUser = {
            userId,
            email: payload.email,
            role: payload.role,
            sessionId: payload.jti,
        };
        next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            res.status(error.statusCode).json({ message: error.message });
            return;
        }
        res.status(401).json({ message: "Unauthorized." });
        return;
    }
};
exports.requireAuth = requireAuth;
const requireRoles = (...roles) => {
    const allowed = new Set(roles.map((role) => role.trim().toLowerCase()));
    return (req, res, next) => {
        const authUser = req.authUser;
        if (!authUser) {
            res.status(401).json({ message: "Unauthorized." });
            return;
        }
        if (!allowed.has(authUser.role.trim().toLowerCase())) {
            res.status(403).json({ message: "Forbidden. Insufficient permissions." });
            return;
        }
        next();
    };
};
exports.requireRoles = requireRoles;
