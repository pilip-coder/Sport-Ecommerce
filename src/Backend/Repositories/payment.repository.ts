import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { appDataSource } from "../Config/database.config";
import { environment } from "../Config/environment";
import { AppError } from "../Core/errors";
import type { PaymentEntity } from "../Models/payment.model";

let paymentsDbReady = false;
let paymentsDbInitPromise: Promise<void> | null = null;
let orderPaymentStatusColumnPromise: Promise<boolean> | null = null;

export interface OrderPaymentContext {
  orderId: number;
  userId: number;
  totalAmount: number;
}

export interface PaymentFilter {
  userId?: number;
  orderId?: number;
  status?: string;
}

export interface CreatePaymentInput {
  orderId: number;
  provider: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  transactionId: string | null;
}

export interface UpdatePaymentStatusInput {
  status: string;
  transactionId?: string | null;
}

const ensurePaymentsDatabase = async (): Promise<void> => {
  if (paymentsDbReady || appDataSource.isInitialized) {
    paymentsDbReady = true;
    return;
  }

  if (!paymentsDbInitPromise) {
    paymentsDbInitPromise = appDataSource
      .initialize()
      .then(() => {
        paymentsDbReady = true;
      })
      .finally(() => {
        paymentsDbInitPromise = null;
      });
  }

  try {
    await paymentsDbInitPromise;
  } catch (error) {
    const message = (error as { message?: string })?.message ?? String(error);
    throw new AppError(`Database unavailable: ${message}`, 503);
  }
};

const ensurePaymentsTable = async (): Promise<void> => {
  await ensurePaymentsDatabase();

  await appDataSource.query(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id INT NOT NULL AUTO_INCREMENT,
      order_id INT NOT NULL,
      provider VARCHAR(50) NOT NULL DEFAULT 'manual',
      method VARCHAR(50) NOT NULL DEFAULT 'cash',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      amount DECIMAL(10, 2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      transaction_id VARCHAR(100) DEFAULT NULL,
      paid_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (payment_id),
      KEY idx_payments_order_id (order_id),
      KEY idx_payments_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const orderHasPaymentStatusColumn = async (): Promise<boolean> => {
  if (!orderPaymentStatusColumnPromise) {
    orderPaymentStatusColumnPromise = (async () => {
      await ensurePaymentsDatabase();

      const rows = (await appDataSource.query(
        `
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ?
            AND TABLE_NAME = 'orders'
            AND COLUMN_NAME = 'payment_status'
          LIMIT 1
        `,
        [environment.databaseName],
      )) as RowDataPacket[];

      return rows.length > 0;
    })().finally(() => {
      orderPaymentStatusColumnPromise = null;
    });
  }

  return orderPaymentStatusColumnPromise;
};

const syncOrderPaymentStatus = async (orderId: number, status: string): Promise<void> => {
  if (!(await orderHasPaymentStatusColumn())) {
    return;
  }

  await appDataSource.query(
    "UPDATE orders SET payment_status = ? WHERE order_id = ?",
    [status, orderId],
  );
};

const mapPayment = (row: Record<string, unknown>): PaymentEntity => ({
  id: Number(row.payment_id),
  orderId: Number(row.order_id),
  provider: String(row.provider),
  method: String(row.method),
  status: String(row.status),
  amount: Number(row.amount),
  currency: String(row.currency),
  transactionId: row.transaction_id != null ? String(row.transaction_id) : null,
  paidAt: row.paid_at != null ? new Date(String(row.paid_at)) : null,
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

export const findOrderPaymentContext = async (orderId: number): Promise<OrderPaymentContext | null> => {
  await ensurePaymentsDatabase();

  const rows = (await appDataSource.query(
    `
      SELECT
        order_id AS orderId,
        user_id AS userId,
        total_amount AS totalAmount
      FROM orders
      WHERE order_id = ?
      LIMIT 1
    `,
    [orderId],
  )) as Array<RowDataPacket & OrderPaymentContext>;

  const order = rows[0];
  if (!order) {
    return null;
  }

  return {
    orderId: Number(order.orderId),
    userId: Number(order.userId),
    totalAmount: Number(order.totalAmount),
  };
};

export const createPaymentInRepository = async (input: CreatePaymentInput): Promise<number> => {
  await ensurePaymentsTable();

  const result = (await appDataSource.query(
    `
      INSERT INTO payments (
        order_id,
        provider,
        method,
        status,
        amount,
        currency,
        transaction_id,
        paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'paid' THEN NOW() ELSE NULL END)
    `,
    [
      input.orderId,
      input.provider,
      input.method,
      input.status,
      input.amount,
      input.currency,
      input.transactionId,
      input.status,
    ],
  )) as ResultSetHeader;

  await syncOrderPaymentStatus(input.orderId, input.status);

  return Number(result.insertId);
};

export const findPaymentById = async (paymentId: number): Promise<PaymentEntity | null> => {
  await ensurePaymentsTable();

  const rows = (await appDataSource.query(
    "SELECT * FROM payments WHERE payment_id = ? LIMIT 1",
    [paymentId],
  )) as Array<Record<string, unknown>>;

  return rows.length > 0 ? mapPayment(rows[0]) : null;
};

export const listPaymentsFromRepository = async (filter: PaymentFilter): Promise<PaymentEntity[]> => {
  await ensurePaymentsTable();

  const where: string[] = [];
  const params: Array<number | string> = [];

  if (filter.userId) {
    where.push("o.user_id = ?");
    params.push(filter.userId);
  }

  if (filter.orderId) {
    where.push("p.order_id = ?");
    params.push(filter.orderId);
  }

  if (filter.status) {
    where.push("p.status = ?");
    params.push(filter.status);
  }

  const rows = (await appDataSource.query(
    `
      SELECT p.*
      FROM payments p
      LEFT JOIN orders o ON o.order_id = p.order_id
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY p.created_at DESC
    `,
    params,
  )) as Array<Record<string, unknown>>;

  return rows.map(mapPayment);
};

export const updatePaymentStatusInRepository = async (
  paymentId: number,
  input: UpdatePaymentStatusInput,
): Promise<boolean> => {
  await ensurePaymentsTable();

  const result = (await appDataSource.query(
    `
      UPDATE payments
      SET status = ?,
          transaction_id = COALESCE(?, transaction_id),
          paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
          updated_at = NOW()
      WHERE payment_id = ?
    `,
    [input.status, input.transactionId ?? null, input.status, paymentId],
  )) as ResultSetHeader;

  if (result.affectedRows > 0) {
    const payment = await findPaymentById(paymentId);
    if (payment) {
      await syncOrderPaymentStatus(payment.orderId, input.status);
    }
  }

  return result.affectedRows > 0;
};
