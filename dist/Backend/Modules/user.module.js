"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserModule = void 0;
const user_route_1 = __importDefault(require("../Routes/user.route"));
const registerUserModule = (app) => {
    app.use("/api/users", user_route_1.default);
};
exports.registerUserModule = registerUserModule;
