"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.login = exports.register = void 0;
const errors_1 = require("../Core/errors");
const utils_1 = require("../Core/utils");
const auth_service_1 = require("../Services/auth.service");
exports.register = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, auth_service_1.registerUser)(req.body);
    res.status(201).json({
        message: "User registered successfully.",
        ...result,
    });
});
exports.login = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, auth_service_1.loginUser)(req.body);
    res.status(200).json({
        message: "Login successful.",
        ...result,
    });
});
exports.logout = (0, utils_1.asyncHandler)(async (req, res) => {
    const authUser = req.authUser;
    if (!authUser?.sessionId) {
        throw new errors_1.AppError("Unauthorized.", 401);
    }
    await (0, auth_service_1.logoutUser)(authUser.userId, authUser.sessionId);
    res.status(200).json({
        message: "Logout successful.",
    });
});
