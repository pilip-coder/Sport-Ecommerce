import type { RowDataPacket } from "mysql2/promise";

export interface OrderRow extends RowDataPacket {
  id: number;
  user_id: number;
  address_id: number | null;
  status: string;
  total_amount: number;
  shipping_fee: number;
  discount_amount: number;
  payment_status: string;
  placed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderEntity {
  id: number;
  userId: number;
  addressId: number | null;
  status: string;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  paymentStatus: string;
  placedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
