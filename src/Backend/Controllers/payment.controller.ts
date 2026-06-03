import type { Request, Response } from "express";

import { AppError } from "../Core/errors";
import type { AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import type { CreatePaymentDto, PaymentListQueryDto, UpdatePaymentStatusDto } from "../dto/payment";
import {
  changePaymentStatus,
  createPayment,
  getPaymentDetail,
  getPaymentList,
} from "../Services/payment.service";

interface PaymentParams {
  [key: string]: string;
  id: string;
}

const getAuthUser = (req: unknown) => {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (!authUser) {
    throw new AppError("Authorization header is required.", 401);
  }

  return authUser;
};

export const listPayments = asyncHandler<never, unknown, never, Record<string, string | string[]>>(
  async (req: Request<never, unknown, never, Record<string, string | string[]>>, res: Response) => {
    const authUser = getAuthUser(req);
    const payments = await getPaymentList(authUser.userId, authUser.role, req.query as PaymentListQueryDto);

    res.status(200).json({ payments });
  },
);

export const getPayment = asyncHandler<PaymentParams>(
  async (req: Request<PaymentParams>, res: Response) => {
    const authUser = getAuthUser(req);
    const payment = await getPaymentDetail(req.params.id, authUser.userId, authUser.role);

    res.status(200).json({ payment });
  },
);

export const createPaymentByUser = asyncHandler<never, unknown, CreatePaymentDto>(
  async (req: Request<never, unknown, CreatePaymentDto>, res: Response) => {
    const authUser = getAuthUser(req);
    const payment = await createPayment(authUser.userId, authUser.role, req.body);

    res.status(201).json({
      message: "Payment created successfully.",
      payment,
    });
  },
);

export const updatePaymentStatusByAdmin = asyncHandler<PaymentParams, unknown, UpdatePaymentStatusDto>(
  async (req: Request<PaymentParams, unknown, UpdatePaymentStatusDto>, res: Response) => {
    const authUser = getAuthUser(req);
    const payment = await changePaymentStatus(req.params.id, authUser.role, req.body);

    res.status(200).json({
      message: "Payment updated successfully.",
      payment,
    });
  },
);
