import type { RowDataPacket } from "mysql2/promise";

export interface OrderRow extends RowDataPacket {
  order_id: number;
  user_id: number;
  address_id: number | null;
  full_name?: string;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  province?: string | null;
  order_status: string;
  total_amount: number;
  created_at: Date;
}

export interface OrderEntity {
  id: number;
  userId: number;
  addressId: number | null;
  customerName: string;
  address: string;
  phone: string;
  status: string;
  totalAmount: number;
  orderDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
