"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const environment_1 = require("../Config/environment");
const errors_1 = require("../Core/errors");
const auth_repository_1 = require("../Repositories/auth.repository");
const scrypt = (0, node_util_1.promisify)(node_crypto_1.scrypt);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) => email.trim().toLowerCase();
const toAuthUserResponse = (user) => ({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    roleName: user.roleName,
});
const validateRegisterPayload = (payload) => {
    if (!payload.fullName || payload.fullName.trim().length < 2) {
        throw new errors_1.AppError("Full name must be at least 2 characters.", 400);
    }
    if (!EMAIL_PATTERN.test(payload.email)) {
        throw new errors_1.AppError("A valid email is required.", 400);
    }
    if (!payload.password || payload.password.length < 6) {
        throw new errors_1.AppError("Password must be at least 6 characters.", 400);
    }
};
const validateLoginPayload = (payload) => {
    if (!EMAIL_PATTERN.test(payload.email)) {
        throw new errors_1.AppError("A valid email is required.", 400);
    }
    if (!payload.password) {
        throw new errors_1.AppError("Password is required.", 400);
    }
};
const createPasswordHash = async (rawPassword) => {
    const salt = (0, node_crypto_1.randomBytes)(16).toString("hex");
    const derived = (await scrypt(rawPassword, salt, 64));
    return `${salt}:${derived.toString("hex")}`;
};
const verifyPassword = async (rawPassword, storedHash) => {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) {
        return false;
    }
    const derived = (await scrypt(rawPassword, salt, 64));
    const storedBuffer = Buffer.from(key, "hex");
    if (storedBuffer.length !== derived.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(storedBuffer, derived);
};
const encodeBase64Url = (value) => Buffer.from(value).toString("base64url");
const parseJwtExpirySeconds = (value) => {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d+)([smhd])?$/i);
    if (!match) {
        return 24 * 60 * 60;
    }
    const amount = Number(match[1]);
    const unit = (match[2] ?? "s").toLowerCase();
    if (unit === "m") {
        return amount * 60;
    }
    if (unit === "h") {
        return amount * 60 * 60;
    }
    if (unit === "d") {
        return amount * 24 * 60 * 60;
    }
    return amount;
};
const createAccessToken = (user) => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = parseJwtExpirySeconds(environment_1.environment.jwtExpiresIn);
    const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = encodeBase64Url(JSON.stringify({
        sub: user.id,
        email: user.email,
        role: user.roleName,
        iat: nowSeconds,
        exp: nowSeconds + expiresInSeconds,
    }));
    const signature = (0, node_crypto_1.createHmac)("sha256", environment_1.environment.jwtSecret)
        .update(`${header}.${payload}`)
        .digest("base64url");
    return `${header}.${payload}.${signature}`;
};
const normalizeRoleName = (roleName) => {
    return roleName?.trim().toLowerCase() ?? "customer";
};
const isPublicRoleName = (roleName) => {
    return roleName === "customer" || roleName === "staff";
};
const registerUser = async (payload) => {
    validateRegisterPayload(payload);
    const requestedRoleName = normalizeRoleName(payload.roleName);
    if (!isPublicRoleName(requestedRoleName)) {
        if (requestedRoleName === "admin") {
            throw new errors_1.AppError("Public registration cannot create admin accounts.", 403);
        }
        throw new errors_1.AppError("Public registration only allows customer or staff accounts.", 400);
    }
    const email = normalizeEmail(payload.email);
    const existingUser = await (0, auth_repository_1.findUserByEmail)(email);
    if (existingUser) {
        throw new errors_1.AppError("Email is already registered.", 409);
    }
    const passwordHash = await createPasswordHash(payload.password);
    const createdUser = await (0, auth_repository_1.createUser)({
        email,
        fullName: payload.fullName.trim(),
        passwordHash,
        phone: payload.phone?.trim() || null,
        roleName: requestedRoleName,
    });
    return {
        user: toAuthUserResponse(createdUser),
        accessToken: createAccessToken(createdUser),
    };
};
exports.registerUser = registerUser;
const loginUser = async (payload) => {
    validateLoginPayload(payload);
    const email = normalizeEmail(payload.email);
    const existingUser = await (0, auth_repository_1.findUserByEmail)(email);
    if (!existingUser) {
        throw new errors_1.AppError("Invalid email or password.", 401);
    }
    const passwordMatches = await verifyPassword(payload.password, existingUser.passwordHash);
    if (!passwordMatches) {
        throw new errors_1.AppError("Invalid email or password.", 401);
    }
    return {
        user: toAuthUserResponse(existingUser),
        accessToken: createAccessToken(existingUser),
    };
};
exports.loginUser = loginUser;
