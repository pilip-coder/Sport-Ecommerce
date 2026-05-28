"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const environment_1 = require("./Backend/Config/environment");
const errors_1 = require("./Backend/Core/errors");
const middleware_1 = require("./Backend/Core/middleware");
const app_module_1 = require("./Backend/Modules/app.module");
const app = (0, express_1.default)();
app.disable("x-powered-by");
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((_req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (_req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }
    next();
});
app.use(middleware_1.requestLogger);
// Serve a dev-friendly frontend entry.
// Note: keep this CommonJS-safe (no import.meta usage).
const indexHtmlPath = node_path_1.default.resolve(process.cwd(), "index.html");
const uploadsPath = node_path_1.default.resolve(process.cwd(), "uploads");
// Static file serving so the browser can load frontend assets.
app.use(express_1.default.static(process.cwd()));
app.use(express_1.default.static(node_path_1.default.resolve(process.cwd(), "src")));
app.use("/uploads", express_1.default.static(uploadsPath));
app.get(["/", "/login", "/register"], (_req, res) => {
    res.sendFile(indexHtmlPath);
});
app.get("/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        service: "sport-ecommerce",
        env: environment_1.environment.nodeEnv,
        timestamp: new Date().toISOString(),
    });
});
app.get("/api", (_req, res) => {
    res.status(200).json({
        name: "sport-ecommerce-api",
        version: "1.0.0",
    });
});
(0, app_module_1.registerModules)(app);
app.use(errors_1.notFoundHandler);
app.use(errors_1.errorHandler);
exports.default = app;
