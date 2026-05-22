import { Router } from "express";

import { OrderController } from "../controllers/order.controller";
import { asyncHandler } from "../core/utils";

export const createOrderRouter = (orderController: OrderController): Router => {
  const router = Router();

  router.get("/", asyncHandler(orderController.list));
  router.get("/:id", asyncHandler(orderController.getById));
  router.post("/", asyncHandler(orderController.create));

  return router;
};
