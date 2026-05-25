import { Request, Response } from "express";

import { asyncHandler } from "../Core/utils";
import type {
  AdminListQueryDto,
  AdminUpdatePaymentStatusDto,
  AdminUpdateUserStatusDto,
} from "../dto/admin";
import {
  changeAdminPaymentStatus,
  changeAdminUserStatus,
  getAdminFinancialSummary,
  listAdminOrders,
  listAdminPayments,
  listAdminUsers,
  removeAdminUser,
} from "../Services/admin.service";

interface UserParams {
  userId: string;
}

interface PaymentParams {
  paymentId: string;
}

export const getUsers = asyncHandler<never, unknown, never, AdminListQueryDto>(
  async (req: Request<never, unknown, never, AdminListQueryDto>, res: Response) => {
    const users = await listAdminUsers(req.query);
    res.status(200).json({ users });
  },
);

export const updateUserStatus = asyncHandler<UserParams, unknown, AdminUpdateUserStatusDto>(
  async (req: Request<UserParams, unknown, AdminUpdateUserStatusDto>, res: Response) => {
    await changeAdminUserStatus(req.params.userId, req.body);
    res.status(200).json({ message: "User updated successfully." });
  },
);

export const deleteUser = asyncHandler<UserParams>(async (req, res) => {
  await removeAdminUser(req.params.userId);
  res.status(200).json({ message: "User deleted successfully." });
});

export const getOrders = asyncHandler<never, unknown, never, AdminListQueryDto>(
  async (req: Request<never, unknown, never, AdminListQueryDto>, res: Response) => {
    const orders = await listAdminOrders(req.query);
    res.status(200).json({ orders });
  },
);

export const getPayments = asyncHandler<never, unknown, never, AdminListQueryDto>(
  async (req: Request<never, unknown, never, AdminListQueryDto>, res: Response) => {
    const payments = await listAdminPayments(req.query);
    res.status(200).json({ payments });
  },
);

export const getFinancialSummary = asyncHandler(async (_req, res) => {
  const summary = await getAdminFinancialSummary();
  res.status(200).json({ summary });
});

export const updatePaymentStatus = asyncHandler<
  PaymentParams,
  unknown,
  AdminUpdatePaymentStatusDto
>(async (req: Request<PaymentParams, unknown, AdminUpdatePaymentStatusDto>, res: Response) => {
  await changeAdminPaymentStatus(req.params.paymentId, req.body);
  res.status(200).json({ message: "Payment updated successfully." });
});
