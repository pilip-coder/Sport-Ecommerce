import type { Express } from "express";

import authRouter from "../Routes/auth.route";

export const registerAuthModule = (app: Express): void => {
  app.use("/api/auth", authRouter);
};
