"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCatalogModule = void 0;
const catalog_route_1 = __importDefault(require("../Routes/catalog.route"));
const registerCatalogModule = (app) => {
    app.use("/api/products", catalog_route_1.default);
};
exports.registerCatalogModule = registerCatalogModule;
