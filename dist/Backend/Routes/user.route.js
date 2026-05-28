"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const guards_1 = require("../Core/guards");
const user_controller_1 = require("../Controllers/user.controller");
const userRouter = (0, express_1.Router)();
// Admin-only
userRouter.get("/", guards_1.requireAuth, (0, guards_1.requireRoles)("Admin"), user_controller_1.listAllUsers);
userRouter.delete("/:id", guards_1.requireAuth, (0, guards_1.requireRoles)("Admin"), user_controller_1.deleteUser);
exports.default = userRouter;
