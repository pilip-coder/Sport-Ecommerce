"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCategoryModule = void 0;
const category_route_1 = __importDefault(require("../Routes/category.route"));
const registerCategoryModule = (app) => {
    app.use("/api/categories", category_route_1.default);
};
exports.registerCategoryModule = registerCategoryModule;
