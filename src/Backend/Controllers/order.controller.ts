<<<<<<< HEAD
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
=======
import type { Request, Response } from "express";

import { AppError } from "../Core/errors";
import { AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import type { CreateOrderDto, OrderFilterDto, UpdateOrderStatusDto } from "../dto/order";
import {
  changeOrderStatus,
  createUserOrder,
  getAllOrders,
  getOrderDetail,
} from "../Services/order.service";

const toPositiveNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const createOrder = asyncHandler<never, unknown, CreateOrderDto>(
  async (req: Request<never, unknown, CreateOrderDto>, res: Response) => {
    const authUser = (req as AuthenticatedRequest).authUser;
    if (!authUser) {
      throw new AppError("Authorization header is required.", 401);
    }

    const result = await createUserOrder(authUser.userId, req.body);
    res.status(201).json({
      message: "Order created successfully.",
      order: result.order,
      items: result.items,
    });
  },
);

export const getOrder = asyncHandler<{ id: string }>(
  async (req: Request<{ id: string }>, res: Response) => {
    const orderId = Number(req.params.id);
    const result = await getOrderDetail(orderId);

    if (!result) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    res.status(200).json(result);
  },
);

export const updateStatus = asyncHandler<{ id: string }, unknown, UpdateOrderStatusDto>(
  async (req: Request<{ id: string }, unknown, UpdateOrderStatusDto>, res: Response) => {
    const orderId = Number(req.params.id);
    await changeOrderStatus(orderId, req.body);
    res.status(200).json({ message: "Order status updated successfully." });
  },
);

export const listAllOrders = asyncHandler<never, unknown, never, OrderFilterDto>(
  async (req: Request<never, unknown, never, OrderFilterDto>, res: Response) => {
    const result = await getAllOrders({
      status: req.query.status,
      page: toPositiveNumber(req.query.page, 1),
      limit: toPositiveNumber(req.query.limit, 10),
    });
    res.status(200).json(result);
  },
);
>>>>>>> 2e74274e36722fb30673341fdd231f580c0f1089
