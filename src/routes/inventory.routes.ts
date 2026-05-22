import { Router } from "express";

import { InventoryController } from "../controllers/inventory.controller";
import { asyncHandler } from "../core/utils";

export const createInventoryRouter = (inventoryController: InventoryController): Router => {
  const router = Router();

  router.get("/:variantId", asyncHandler(inventoryController.getByVariantId));
  router.put("/", asyncHandler(inventoryController.update));

  return router;
};
