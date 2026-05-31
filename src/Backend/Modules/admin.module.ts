import type { Express } from "express";

import adminRouter from "../Routes/admin.route";

export const registerAdminModule = (app: Express): void => {
  app.use("/api/admin", adminRouter);
};
