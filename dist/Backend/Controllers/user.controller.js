"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = exports.getCurrentUser = exports.listUsers = void 0;
const utils_1 = require("../Core/utils");
const user_service_1 = require("../Services/user.service");
exports.listUsers = (0, utils_1.asyncHandler)(async (_req, res) => {
    const users = await (0, user_service_1.getUsers)();
    res.status(200).json({ items: users });
});
exports.getCurrentUser = (0, utils_1.asyncHandler)(async (req, res) => {
    const authUser = req.authUser;
    const user = await (0, user_service_1.getUserById)(Number(authUser?.userId));
    res.status(200).json({ user });
});
exports.getUser = (0, utils_1.asyncHandler)(async (req, res) => {
    const user = await (0, user_service_1.getUserById)(Number(req.params.id));
    res.status(200).json({ user });
});
