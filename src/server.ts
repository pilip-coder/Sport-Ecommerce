import { createServer } from "node:http";

import app from "./app";
import { closeDatabase, connectDatabase } from "./Backend/Config/database.config";
import { environment } from "./Backend/Config/environment";




const server = createServer(app);
const host = process.env.HOST ?? "127.0.0.1";
let isShuttingDown = false;

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Address http://${host}:${environment.port} is already in use.`);
  } else {
    console.error("Server failed to start:", error.message);
  }
  process.exit(1);
});

const shutdown = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Shutting down server...`);

  const forceCloseTimer = setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 10_000);

  server.close(() => {
    clearTimeout(forceCloseTimer);
    closeDatabase()
      .then(() => {
        console.log("Server and database connections closed cleanly.");
        process.exit(0);
      })
      .catch((error: unknown) => {
        console.error("Server closed, but failed to close database pool.", error);
        process.exit(1);
      });
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const bootstrap = async (): Promise<void> => {
  try {
    await connectDatabase();
  } catch (error) {
    console.error(
      "Database is not reachable right now. Server will still start, but DB-backed endpoints may fail until MySQL is up.",
      error,
    );
  }

  server.listen(environment.port, host, () => {
    console.log(`Sport Ecommerce API is running at http://${host}:${environment.port}`);
  });
};

void bootstrap();
