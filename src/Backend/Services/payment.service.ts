import { AppError } from "../Core/errors";
import type { CreatePaymentDto, PaymentListQueryDto, UpdatePaymentStatusDto } from "../dto/payment";
import type { PaymentEntity } from "../Models/payment.model";
import {
  createPaymentInRepository,
  findOrderPaymentContext,
  findPaymentById,
  listPaymentsFromRepository,
  updatePaymentStatusInRepository,
} from "../Repositories/payment.repository";

const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded", "unpaid"]);

const isPrivilegedRole = (role: string): boolean => {
  const normalizedRole = role.trim().toLowerCase();
  return normalizedRole === "admin" || normalizedRole === "staff";
};

const toPositiveInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsed;
};

const toPositiveAmount = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError("amount must be a positive number.", 400);
  }

  return parsed;
};

const normalizeShortText = (value: unknown, fallback: string, fieldName: string): string => {
  const normalized = String(value ?? fallback).trim().toLowerCase();

  if (!normalized) {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  if (normalized.length > 50) {
    throw new AppError(`${fieldName} must be 50 characters or less.`, 400);
  }

  return normalized;
};

const normalizeCurrency = (value: unknown): string => {
  const currency = String(value ?? "USD").trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new AppError("currency must be a 3-letter code, like USD.", 400);
  }

  return currency;
};

const normalizeStatus = (value: unknown, fallback = "pending"): string => {
  const status = String(value ?? fallback).trim().toLowerCase();

  if (!PAYMENT_STATUSES.has(status)) {
    throw new AppError("Payment status must be pending, paid, failed, refunded, or unpaid.", 400);
  }

  return status;
};

const normalizeTransactionId = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const transactionId = String(value).trim();
  if (transactionId.length > 100) {
    throw new AppError("transactionId must be 100 characters or less.", 400);
  }

  return transactionId || null;
};

const assertPaymentAccess = async (payment: PaymentEntity, userId: number, role: string): Promise<void> => {
  if (isPrivilegedRole(role)) {
    return;
  }

  const order = await findOrderPaymentContext(payment.orderId);
  if (!order || order.userId !== userId) {
    throw new AppError("Forbidden. You can only access your own payments.", 403);
  }
};

export const createPayment = async (
  userId: number,
  role: string,
  payload: CreatePaymentDto,
): Promise<PaymentEntity> => {
  const orderId = toPositiveInteger(payload.orderId, "orderId");
  const order = await findOrderPaymentContext(orderId);

  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  if (!isPrivilegedRole(role) && order.userId !== userId) {
    throw new AppError("Forbidden. You can only pay for your own orders.", 403);
  }

  const paymentId = await createPaymentInRepository({
    orderId,
    provider: normalizeShortText(payload.provider, "manual", "provider"),
    method: normalizeShortText(payload.method, "cash", "method"),
    status: normalizeStatus(payload.status),
    amount: toPositiveAmount(payload.amount, order.totalAmount),
    currency: normalizeCurrency(payload.currency),
    transactionId: normalizeTransactionId(payload.transactionId),
  });

  const payment = await findPaymentById(paymentId);
  if (!payment) {
    throw new AppError("Payment could not be loaded after creation.", 500);
  }

  return payment;
};

export const getPaymentDetail = async (
  paymentIdValue: string,
  userId: number,
  role: string,
): Promise<PaymentEntity> => {
  const paymentId = toPositiveInteger(paymentIdValue, "Payment id");
  const payment = await findPaymentById(paymentId);

  if (!payment) {
    throw new AppError("Payment not found.", 404);
  }

  await assertPaymentAccess(payment, userId, role);
  return payment;
};

export const getPaymentList = async (
  userId: number,
  role: string,
  query: PaymentListQueryDto,
): Promise<PaymentEntity[]> => {
  return listPaymentsFromRepository({
    userId: isPrivilegedRole(role) ? undefined : userId,
    orderId: query.orderId ? toPositiveInteger(query.orderId, "orderId") : undefined,
    status: query.status ? normalizeStatus(query.status) : undefined,
  });
};

export const changePaymentStatus = async (
  paymentIdValue: string,
  role: string,
  payload: UpdatePaymentStatusDto,
): Promise<PaymentEntity> => {
  if (!isPrivilegedRole(role)) {
    throw new AppError("Forbidden. Only admin or staff can update payment status.", 403);
  }

  const paymentId = toPositiveInteger(paymentIdValue, "Payment id");
  const updated = await updatePaymentStatusInRepository(paymentId, {
    status: normalizeStatus(payload.status),
    transactionId: normalizeTransactionId(payload.transactionId),
  });

  if (!updated) {
    throw new AppError("Payment not found.", 404);
  }

  const payment = await findPaymentById(paymentId);
  if (!payment) {
    throw new AppError("Payment could not be loaded after update.", 500);
  }

  return payment;
};
