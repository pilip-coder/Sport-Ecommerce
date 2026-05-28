"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserById = exports.listUsers = void 0;
const database_config_1 = require("../Config/database.config");
const errors_1 = require("../Core/errors");
const user_model_1 = require("../Models/user.model");
let usersDbReady = false;
let usersDbInitPromise = null;
const ensureUsersDatabase = async () => {
    if (usersDbReady || database_config_1.appDataSource.isInitialized) {
        usersDbReady = true;
        return;
    }
    if (!usersDbInitPromise) {
        usersDbInitPromise = (async () => {
            try {
                await database_config_1.appDataSource.initialize();
                usersDbReady = true;
            }
            catch (error) {
                const message = error?.message ?? String(error);
                throw new errors_1.AppError(`Database unavailable: ${message}`, 503);
            }
        })().finally(() => {
            usersDbInitPromise = null;
        });
    }
    await usersDbInitPromise;
};
const listUsers = async () => {
    await ensureUsersDatabase();
    const userRepository = database_config_1.appDataSource.getRepository(user_model_1.UserEntity);
    const users = await userRepository.find();
    return users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        roleName: u.roleName,
    }));
};
exports.listUsers = listUsers;
const deleteUserById = async (id) => {
    await ensureUsersDatabase();
    const userRepository = database_config_1.appDataSource.getRepository(user_model_1.UserEntity);
    const result = await userRepository.delete({ id });
    return (result.affected ?? 0) > 0;
};
exports.deleteUserById = deleteUserById;
