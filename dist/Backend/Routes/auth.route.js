"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../Controllers/auth.controller");
const authRouter = (0, express_1.Router)();
authRouter.post("/register", auth_controller_1.register);
authRouter.post("/login", auth_controller_1.login);
exports.default = authRouter;
