import type { Express } from "express";

import cartRouter from "../Routes/cart.route";

export const registerCartModule = (app: Express): void => {
  app.use("/api/cart", cartRouter);
};
