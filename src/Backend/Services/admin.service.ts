import { AppError } from "../Core/errors";
import type {
  AdminListQueryDto,
  AdminUpdatePaymentStatusDto,
  AdminUpdateUserStatusDto,
} from "../dto/admin";
import {
  findAdminOrders,
  findAdminPayments,
  findAdminUsers,
  findFinancialSummary,
  updateAdminPaymentStatus,
  updateAdminUserStatus,
} from "../Repositories/admin.repository";

const toPositiveInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsed;
};

const normalizeSearch = (query: AdminListQueryDto): string | undefined => {
  const search = query.search?.trim();
  return search ? search : undefined;
};

export const listAdminUsers = async (query: AdminListQueryDto) => {
  return findAdminUsers(normalizeSearch(query));
};

export const changeAdminUserStatus = async (
  userIdValue: string,
  payload: AdminUpdateUserStatusDto,
): Promise<void> => {
  const userId = toPositiveInteger(userIdValue, "User id");

  if (payload.status !== "active" && payload.status !== "inactive") {
    throw new AppError("User status must be active or inactive.", 400);
  }

  const updated = await updateAdminUserStatus(userId, payload.status);
  if (!updated) {
    throw new AppError("User not found.", 404);
  }
};

export const removeAdminUser = async (userIdValue: string): Promise<void> => {
  const userId = toPositiveInteger(userIdValue, "User id");
  const updated = await updateAdminUserStatus(userId, "inactive");

  if (!updated) {
    throw new AppError("User not found.", 404);
  }
};

export const listAdminOrders = async (query: AdminListQueryDto) => {
  return findAdminOrders(normalizeSearch(query));
};

export const listAdminPayments = async (query: AdminListQueryDto) => {
  return findAdminPayments(normalizeSearch(query));
};

export const getAdminFinancialSummary = async () => {
  return findFinancialSummary();
};

export const changeAdminPaymentStatus = async (
  paymentIdValue: string,
  payload: AdminUpdatePaymentStatusDto,
): Promise<void> => {
  const paymentId = toPositiveInteger(paymentIdValue, "Payment id");
  const status = payload.status?.trim().toLowerCase();

  if (!status) {
    throw new AppError("Payment status is required.", 400);
  }

  const updated = await updateAdminPaymentStatus(paymentId, status);
  if (!updated) {
    throw new AppError("Payment not found.", 404);
  }
};
