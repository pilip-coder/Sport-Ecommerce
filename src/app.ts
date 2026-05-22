import express, { type Express } from "express";
import path from "node:path";


import { environment } from "./Backend/Config/environment";


import { errorHandler, notFoundHandler } from "./Backend/Core/errors";
import { requestLogger } from "./Backend/Core/middleware";
import { registerAuthModule } from "./Backend/Modules/auth.module";

const app: Express = express();

app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use(requestLogger);

// Serve a dev-friendly frontend entry.
// Note: keep this CommonJS-safe (no import.meta usage).
const indexHtmlPath = path.resolve(process.cwd(), "index.html");

// Static file serving so the browser can load frontend assets.
app.use(express.static(process.cwd()));
app.use(express.static(path.resolve(process.cwd(), "src")));

app.get(["/", "/login", "/register"], (_req, res) => {
  res.sendFile(indexHtmlPath);
});

app.get("/health", (_req, res) => {

  res.status(200).json({
    status: "ok",
    service: "sport-ecommerce",
    env: environment.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});



app.get("/api", (_req, res) => {
  res.status(200).json({
    name: "sport-ecommerce-api",
    version: "1.0.0",
  });
});

registerAuthModule(app);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
