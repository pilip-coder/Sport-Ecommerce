"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environment = void 0;
const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const toBoolean = (value, fallback) => {
    if (value == null) {
        return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
    }
    return fallback;
};
exports.environment = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: toNumber(process.env.PORT, 3000),
    databaseHost: process.env.DB_HOST ?? "127.0.0.1",
    databasePort: toNumber(process.env.DB_PORT, 3306),
    databaseUser: process.env.DB_USER ?? "root",
    databasePassword: process.env.DB_PASSWORD ?? "",
    databaseName: process.env.DB_NAME ?? "sports_ecommerce",
    databaseConnectionLimit: toNumber(process.env.DB_CONNECTION_LIMIT, 10),
    databaseSynchronize: toBoolean(process.env.DB_SYNCHRONIZE, false),
    jwtSecret: process.env.JWT_SECRET ?? "sport-ecommerce-secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
};
