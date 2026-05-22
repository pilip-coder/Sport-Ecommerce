import { Router } from "express";

import { OrderController } from "../controllers/order.controller";
import { OrderRepository } from "../repositories/order.repository";
import { createOrderRouter } from "../routes/order.routes";
import { OrderService } from "../services/order.service";

export const createOrderModule = (): Router => {
  const orderRepository = new OrderRepository();
  const orderService = new OrderService(orderRepository);
  const orderController = new OrderController(orderService);

  return createOrderRouter(orderController);
};
