import path from "node:path";

import express from "express";

import { errorHandler, notFoundHandler } from "./core/errors";
import { requestLogger } from "./core/middleware";
import { registerModules } from "./modules/app.module";

const app = express();
const viewsPath = path.join(process.cwd(), "src", "views");

app.use(express.json());
app.use(requestLogger);
app.use("/assets", express.static(path.join(viewsPath, "assets")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(viewsPath, "index.html"));
});

app.get("/auth", (_req, res) => {
  res.sendFile(path.join(viewsPath, "auth.html"));
});

app.get("/catalog", (_req, res) => {
  res.sendFile(path.join(viewsPath, "catalog.html"));
});

app.get("/inventory", (_req, res) => {
  res.sendFile(path.join(viewsPath, "inventory.html"));
});

app.get("/orders", (_req, res) => {
  res.sendFile(path.join(viewsPath, "orders.html"));
});

app.get("/payments", (_req, res) => {
  res.sendFile(path.join(viewsPath, "payments.html"));
});

registerModules(app);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
