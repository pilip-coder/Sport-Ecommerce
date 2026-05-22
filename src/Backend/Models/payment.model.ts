import type { RowDataPacket } from "mysql2/promise";

export interface PaymentRow extends RowDataPacket {
  id: number;
  order_id: number;
  provider: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  transaction_id: string | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentEntity {
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
  updatedAt: Date;
}
