import { Router } from "express";

import { InventoryController } from "../Controllers/Inventory.controller";
import { requireAuth, requireRoles } from "../Core/guards";
import { InventoryService } from "../Services/inventory.service";

const inventoryController = new InventoryController(new InventoryService());

const inventoryRouter = Router();

inventoryRouter.get("/", requireAuth, requireRoles("Admin", "Staff"), inventoryController.listInventory);
inventoryRouter.post("/", requireAuth, requireRoles("Admin", "Staff"), inventoryController.createInventory);
inventoryRouter.patch(
  "/:productId",
  requireAuth,
  requireRoles("Admin", "Staff"),
  inventoryController.updateInventory,
);

export default inventoryRouter;
