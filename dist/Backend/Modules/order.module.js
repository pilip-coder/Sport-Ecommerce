"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOrderModule = void 0;
const order_route_1 = __importDefault(require("../Routes/order.route"));
const registerOrderModule = (app) => {
    app.use("/api/orders", order_route_1.default);
};
exports.registerOrderModule = registerOrderModule;
