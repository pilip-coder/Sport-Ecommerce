"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAuthModule = void 0;
const auth_route_1 = __importDefault(require("../Routes/auth.route"));
const registerAuthModule = (app) => {
    app.use("/api/auth", auth_route_1.default);
};
exports.registerAuthModule = registerAuthModule;
