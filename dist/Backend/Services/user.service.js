"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserById = exports.listUsers = void 0;
const errors_1 = require("../Core/errors");
const user_repository_1 = require("../Repositories/user.repository");
const listUsers = async () => {
    return (0, user_repository_1.listUsers)();
};
exports.listUsers = listUsers;
const deleteUserById = async (id) => {
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId <= 0) {
        throw new errors_1.AppError("Invalid user id.", 400);
    }
    const deleted = await (0, user_repository_1.deleteUserById)(userId);
    if (!deleted) {
        throw new errors_1.AppError("User not found.", 404);
    }
};
exports.deleteUserById = deleteUserById;
