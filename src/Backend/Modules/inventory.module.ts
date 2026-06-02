import type { Express } from "express";

import inventoryRouter from "../Routes/inventory.route";

export const registerInventoryModule = (_app: Express): void => {
  _app.use("/api/inventory", inventoryRouter);
  _app.use("/api/stocks", inventoryRouter);
};
