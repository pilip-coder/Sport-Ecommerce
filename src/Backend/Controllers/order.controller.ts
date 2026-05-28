import { Response } from "express";

import { createApiResponse } from "../Core/interceptors";
import { AuthenticatedRequest } from "../Core/guards";
import { OrderService } from "../Services/order.service";

export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  async listOrders(_req: AuthenticatedRequest, res: Response) {
    res.json(createApiResponse(await this.orderService.listOrders()));
  }

  async getOrder(req: AuthenticatedRequest, res: Response) {
    const order = await this.orderService.getOrder(Number(req.params.orderId));
    res.json(createApiResponse(order));
  }

  async createOrder(req: AuthenticatedRequest, res: Response) {
    const order = await this.orderService.createOrder(req.body, req.user?.id ?? null);
    res.status(201).json(createApiResponse(order));
  }
}
