"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.findUsers = exports.findUserById = exports.findUserByEmail = exports.ensureUsersTable = void 0;
const database_config_1 = require("../Config/database.config");
const errors_1 = require("../Core/errors");
const user_model_1 = require("../Models/user.model");
let usersTableReady = false;
let usersTableInitPromise = null;
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
