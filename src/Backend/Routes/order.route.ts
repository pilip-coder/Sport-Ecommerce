import { Router } from "express";

import {
  createOrder,
  getOrder,
  listAllOrders,
  updateStatus,
} from "../Controllers/order.controller";
import { requireAuth } from "../Core/guards";

const orderRouter = Router();

orderRouter.post("/", requireAuth, createOrder);
orderRouter.get("/", requireAuth, listAllOrders);
orderRouter.get("/:id", requireAuth, getOrder);
orderRouter.patch("/:id/status", requireAuth, updateStatus);

export default orderRouter;
