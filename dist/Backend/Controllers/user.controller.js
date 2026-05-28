"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.listAllUsers = void 0;
const utils_1 = require("../Core/utils");
const user_service_1 = require("../Services/user.service");
exports.listAllUsers = (0, utils_1.asyncHandler)(async (_req, res) => {
    const result = await (0, user_service_1.listUsers)();
    res.status(200).json({ items: result });
});
exports.deleteUser = (0, utils_1.asyncHandler)(async (req, res) => {
    await (0, user_service_1.deleteUserById)(String(req.params.id ?? ""));
    res.status(200).json({ message: "User deleted successfully." });
});
