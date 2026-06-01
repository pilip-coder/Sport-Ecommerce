"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserById = exports.getUsers = exports.getUserById = void 0;
const errors_1 = require("../Core/errors");
const auth_repository_1 = require("../Repositories/auth.repository");
const user_repository_1 = require("../Repositories/user.repository");
const toUserResponse = (user) => ({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    roleName: user.roleName,
});
const getUserById = async (id) => {
    if (!Number.isInteger(id) || id < 1) {
        throw new errors_1.AppError("Invalid user id.", 400);
    }
    const user = await (0, auth_repository_1.findUserById)(id);
    if (!user) {
        throw new errors_1.AppError("User not found.", 404);
    }
    return toUserResponse(user);
};
exports.getUserById = getUserById;
const getUsers = async () => {
    const users = await (0, auth_repository_1.findUsers)();
    return users.map(toUserResponse);
};
exports.getUsers = getUsers;
const deleteUserById = async (id) => {
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId < 1) {
        throw new errors_1.AppError("Invalid user id.", 400);
    }
    const deleted = await (0, user_repository_1.deleteUserById)(userId);
    if (!deleted) {
        throw new errors_1.AppError("User not found.", 404);
    }
};
exports.deleteUserById = deleteUserById;
