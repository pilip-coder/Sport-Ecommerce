"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const app_1 = __importDefault(require("./app"));
const database_config_1 = require("./Backend/Config/database.config");
const environment_1 = require("./Backend/Config/environment");
const server = (0, node_http_1.createServer)(app_1.default);
const host = process.env.HOST ?? "127.0.0.1";
let isShuttingDown = false;
server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Address http://${host}:${environment_1.environment.port} is already in use.`);
    }
    else {
        console.error("Server failed to start:", error.message);
    }
    process.exit(1);
});
const shutdown = (signal) => {
    if (isShuttingDown) {
        return;
    }
    isShuttingDown = true;
    console.log(`\nReceived ${signal}. Shutting down server...`);
    const forceCloseTimer = setTimeout(() => {
        console.error("Forcing shutdown after timeout.");
        process.exit(1);
    }, 10000);
    server.close(() => {
        clearTimeout(forceCloseTimer);
        (0, database_config_1.closeDatabase)()
            .then(() => {
            console.log("Server and database connections closed cleanly.");
            process.exit(0);
        })
            .catch((error) => {
            console.error("Server closed, but failed to close database pool.", error);
            process.exit(1);
        });
    });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
const bootstrap = async () => {
    try {
        await (0, database_config_1.connectDatabase)();
    }
    catch (error) {
        console.error("Database is not reachable right now. Server will still start, but DB-backed endpoints may fail until MySQL is up.", error);
    }
    server.listen(environment_1.environment.port, host, () => {
        console.log(`Sport Ecommerce API is running at http://${host}:${environment_1.environment.port}`);
    });
};
void bootstrap();
