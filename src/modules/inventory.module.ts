import { Router } from "express";

import { InventoryController } from "../controllers/inventory.controller";
import { InventoryRepository } from "../repositories/inventory.repository";
import { createInventoryRouter } from "../routes/inventory.routes";
import { InventoryService } from "../services/inventory.service";

export const createInventoryModule = (): Router => {
  const inventoryRepository = new InventoryRepository();
  const inventoryService = new InventoryService(inventoryRepository);
  const inventoryController = new InventoryController(inventoryService);

  return createInventoryRouter(inventoryController);
};
