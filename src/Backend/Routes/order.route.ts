import { Router } from "express";

import {
  createOrder,
  getOrder,
  listAllOrders,
  updateStatus,
} from "../Controllers/order.controller";
import { requireAuth } from "../Core/guards";

const orderRouter = Router();

orderRouter.get("/", listAllOrders);
orderRouter.get("/:id", getOrder);
orderRouter.post("/", requireAuth, createOrder);
orderRouter.patch("/:id/status", requireAuth, updateStatus);

export default orderRouter;
