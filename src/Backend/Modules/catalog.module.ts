import type { Express } from "express";

import catalogRouter from "../Routes/catalog.route";

export const registerCatalogModule = (app: Express): void => {
  app.use("/api/products", catalogRouter);
};
