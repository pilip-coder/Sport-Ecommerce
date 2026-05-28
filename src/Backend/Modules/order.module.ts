import type { Express } from "express";

import orderRouter from "../Routes/order.route";

export const registerOrderModule = (app: Express): void => {
  app.use("/api/orders", orderRouter);
};
