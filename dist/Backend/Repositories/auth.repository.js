"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAuthSession = exports.isAuthSessionActive = exports.createAuthSession = exports.createUser = exports.findUsers = exports.findUserById = exports.findUserByEmail = exports.ensureUsersTable = void 0;
const database_config_1 = require("../Config/database.config");
const errors_1 = require("../Core/errors");
const user_model_1 = require("../Models/user.model");
let usersTableReady = false;
let usersTableInitPromise = null;
let authSessionsTableReady = false;
let authSessionsTableInitPromise = null;
const ensureUsersTable = async () => {
    if (usersTableReady || database_config_1.appDataSource.isInitialized) {
        usersTableReady = true;
        return;
    }
    if (!usersTableInitPromise) {
        usersTableInitPromise = (async () => {
            try {
                await database_config_1.appDataSource.initialize();
                usersTableReady = true;
            }
            catch (error) {
                const message = error?.message ?? String(error);
                throw new errors_1.AppError(`Database unavailable: ${message}`, 503);
            }
        })().finally(() => {
            usersTableInitPromise = null;
        });
    }
    await usersTableInitPromise;
};
exports.ensureUsersTable = ensureUsersTable;
const ensureAuthSessionsTable = async () => {
    await (0, exports.ensureUsersTable)();
    if (authSessionsTableReady) {
        return;
    }
    if (!authSessionsTableInitPromise) {
        authSessionsTableInitPromise = (async () => {
            try {
                await database_config_1.appDataSource.query(`
          CREATE TABLE IF NOT EXISTS auth_sessions (
            session_id varchar(64) NOT NULL PRIMARY KEY,
            user_id int NOT NULL,
            expires_at timestamp NOT NULL,
            revoked_at timestamp NULL DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_auth_sessions_user_id (user_id),
            KEY idx_auth_sessions_expires_at (expires_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
                authSessionsTableReady = true;
            }
            catch (error) {
                const message = error?.message ?? String(error);
                throw new errors_1.AppError(`Database unavailable: ${message}`, 503);
            }
        })().finally(() => {
            authSessionsTableInitPromise = null;
        });
    }
    await authSessionsTableInitPromise;
};
const findUserByEmail = async (email) => {
    await (0, exports.ensureUsersTable)();
    const userRepository = database_config_1.appDataSource.getRepository(user_model_1.UserEntity);
    const user = await userRepository.findOne({ where: { email } });
    return user ?? null;
};
exports.findUserByEmail = findUserByEmail;
const findUserById = async (id) => {
    await (0, exports.ensureUsersTable)();
    const userRepository = database_config_1.appDataSource.getRepository(user_model_1.UserEntity);
    const user = await userRepository.findOne({ where: { id } });
    return user ?? null;
};
exports.findUserById = findUserById;
const findUsers = async () => {
    await (0, exports.ensureUsersTable)();
    const userRepository = database_config_1.appDataSource.getRepository(user_model_1.UserEntity);
    return await userRepository.find({ order: { id: "ASC" } });
};
exports.findUsers = findUsers;
const getNextUserId = async () => {
    const rows = (await database_config_1.appDataSource.query("SELECT COALESCE(MAX(user_id), 0) + 1 AS next_id FROM users"));
    return Number(rows[0]?.next_id ?? 1);
};
const resolveRoleId = async (roleName) => {
    const normalizedRoleName = roleName.trim().toLowerCase();
    const exactRows = (await database_config_1.appDataSource.query("SELECT role_id FROM roles WHERE LOWER(role_name) = ? LIMIT 1", [normalizedRoleName]));
    if (exactRows.length > 0) {
        return Number(exactRows[0].role_id);
    }
    const customerRows = (await database_config_1.appDataSource.query("SELECT role_id FROM roles WHERE LOWER(role_name) = 'customer' LIMIT 1"));
    if (customerRows.length > 0) {
        return Number(customerRows[0].role_id);
    }
    return null;
};
const countAdminUsers = async () => {
    const rows = (await database_config_1.appDataSource.query("SELECT COUNT(*) AS total FROM users WHERE role_id = 1"));
    return Number(rows[0]?.total ?? 0);
};
const createUser = async (input) => {
    await (0, exports.ensureUsersTable)();
    const normalizedRoleName = input.roleName.trim().toLowerCase();
    if (normalizedRoleName === "admin") {
        const existingAdmins = await countAdminUsers();
        if (existingAdmins > 0) {
            throw new errors_1.AppError("Admin account already exists.", 409);
        }
    }
    const userRepository = database_config_1.appDataSource.getRepository(user_model_1.UserEntity);
    const [nextUserId, roleId] = await Promise.all([getNextUserId(), resolveRoleId(input.roleName)]);
    const user = userRepository.create({
        id: nextUserId,
        roleId,
        email: input.email,
        fullName: input.fullName,
        passwordHash: input.passwordHash,
        phone: input.phone,
    });
    try {
        return await userRepository.save(user);
    }
    catch (error) {
        const errorCode = error.code
            ?? error.driverError?.code;
        if (errorCode === "ER_DUP_ENTRY") {
            throw new errors_1.AppError("Email is already registered.", 409);
        }
        throw error;
    }
};
exports.createUser = createUser;
const createAuthSession = async (userId, sessionId, expiresAt) => {
    await ensureAuthSessionsTable();
    await database_config_1.appDataSource.query("INSERT INTO auth_sessions (session_id, user_id, expires_at, revoked_at, created_at) VALUES (?, ?, ?, NULL, NOW())", [sessionId, userId, expiresAt]);
};
exports.createAuthSession = createAuthSession;
const isAuthSessionActive = async (userId, sessionId) => {
    await ensureAuthSessionsTable();
    const rows = (await database_config_1.appDataSource.query(`
      SELECT 1
      FROM auth_sessions
      WHERE session_id = ?
        AND user_id = ?
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `, [sessionId, userId]));
    return rows.length > 0;
};
exports.isAuthSessionActive = isAuthSessionActive;
const revokeAuthSession = async (userId, sessionId) => {
    await ensureAuthSessionsTable();
    const result = await database_config_1.appDataSource.query("UPDATE auth_sessions SET revoked_at = NOW() WHERE session_id = ? AND user_id = ? AND revoked_at IS NULL", [sessionId, userId]);
    return Number(result?.affectedRows ?? 0) > 0;
};
exports.revokeAuthSession = revokeAuthSession;
