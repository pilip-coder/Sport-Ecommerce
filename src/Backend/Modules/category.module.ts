import type { Express } from "express";

import categoryRouter from "../Routes/category.route";

export const registerCategoryModule = (app: Express): void => {
  app.use("/api/categories", categoryRouter);
};
