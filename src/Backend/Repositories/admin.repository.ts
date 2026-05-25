import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";

export interface AdminUserRecord extends RowDataPacket {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  status: string | null;
  roleId: number | null;
  roleName: string | null;
  createdAt: Date;
}

export interface AdminOrderRecord extends RowDataPacket {
  id: number;
  userId: number;
  customerName: string | null;
  status: string;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  paymentStatus: string;
  placedAt: Date | null;
  createdAt: Date;
}

export interface AdminPaymentRecord extends RowDataPacket {
  id: number;
  orderId: number;
  provider: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  transactionId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface FinancialSummaryRecord extends RowDataPacket {
  totalOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingPayments: number;
}

let databaseInitPromise: Promise<void> | null = null;

const ensureDatabase = async (): Promise<void> => {
  if (appDataSource.isInitialized) {
    return;
  }

  if (!databaseInitPromise) {
    databaseInitPromise = appDataSource
      .initialize()
      .then(() => undefined)
      .finally(() => {
        databaseInitPromise = null;
      });
  }

  try {
    await databaseInitPromise;
  } catch (error) {
    const message = (error as { message?: string })?.message ?? String(error);
    throw new AppError(`Database unavailable: ${message}`, 503);
  }
};

export const findAdminUsers = async (search?: string): Promise<AdminUserRecord[]> => {
  await ensureDatabase();

  const where: string[] = [];
  const params: unknown[] = [];

  if (search?.trim()) {
    where.push("(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)");
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  return appDataSource.query(
    `
      SELECT
        u.user_id AS id,
        u.full_name AS fullName,
        u.email,
        u.phone,
        u.status,
        u.role_id AS roleId,
        r.role_name AS roleName,
        u.created_at AS createdAt
      FROM users u
      LEFT JOIN roles r ON r.role_id = u.role_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY u.created_at DESC
    `,
    params,
  ) as Promise<AdminUserRecord[]>;
};

export const updateAdminUserStatus = async (userId: number, status: string): Promise<boolean> => {
  await ensureDatabase();

  const result = (await appDataSource.query(
    "UPDATE users SET status = ? WHERE user_id = ?",
    [status, userId],
  )) as ResultSetHeader;

  return result.affectedRows > 0;
};

export const findAdminOrders = async (search?: string): Promise<AdminOrderRecord[]> => {
  await ensureDatabase();

  const where: string[] = [];
  const params: unknown[] = [];

  if (search?.trim()) {
    where.push("(CAST(o.order_id AS CHAR) LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)");
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  return appDataSource.query(
    `
      SELECT
        o.order_id AS id,
        o.user_id AS userId,
        u.full_name AS customerName,
        o.status,
        o.total_amount AS totalAmount,
        o.shipping_fee AS shippingFee,
        o.discount_amount AS discountAmount,
        o.payment_status AS paymentStatus,
        o.placed_at AS placedAt,
        o.created_at AS createdAt
      FROM orders o
      LEFT JOIN users u ON u.user_id = o.user_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY o.created_at DESC
    `,
    params,
  ) as Promise<AdminOrderRecord[]>;
};

export const findAdminPayments = async (search?: string): Promise<AdminPaymentRecord[]> => {
  await ensureDatabase();

  const where: string[] = [];
  const params: unknown[] = [];

  if (search?.trim()) {
    where.push("(CAST(payment_id AS CHAR) LIKE ? OR CAST(order_id AS CHAR) LIKE ? OR transaction_id LIKE ?)");
    const pattern = `%${search.trim()}%`;
    params.push(pattern, pattern, pattern);
  }

  return appDataSource.query(
    `
      SELECT
        payment_id AS id,
        order_id AS orderId,
        provider,
        method,
        status,
        amount,
        currency,
        transaction_id AS transactionId,
        paid_at AS paidAt,
        created_at AS createdAt
      FROM payments
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY created_at DESC
    `,
    params,
  ) as Promise<AdminPaymentRecord[]>;
};

export const findFinancialSummary = async (): Promise<FinancialSummaryRecord> => {
  await ensureDatabase();

  const rows = (await appDataSource.query(`
    SELECT
      (SELECT COUNT(*) FROM orders) AS totalOrders,
      COALESCE((SELECT SUM(total_amount) FROM orders), 0) AS totalRevenue,
      COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'paid'), 0) AS paidRevenue,
      (SELECT COUNT(*) FROM payments WHERE status IN ('pending', 'unpaid')) AS pendingPayments
  `)) as FinancialSummaryRecord[];

  return rows[0] ?? {
    totalOrders: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    pendingPayments: 0,
  } as FinancialSummaryRecord;
};

export const updateAdminPaymentStatus = async (
  paymentId: number,
  status: string,
): Promise<boolean> => {
  await ensureDatabase();

  const result = (await appDataSource.query(
    `
      UPDATE payments
      SET status = ?,
          paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
          updated_at = NOW()
      WHERE payment_id = ?
    `,
    [status, status, paymentId],
  )) as ResultSetHeader;

  return result.affectedRows > 0;
};
