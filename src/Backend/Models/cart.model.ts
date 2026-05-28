import type { RowDataPacket } from "mysql2/promise";

export interface CartRow extends RowDataPacket {
  cart_id: number;
  user_id: number;
  created_at: Date;
}

export interface CartEntity {
  id: number;
  userId: number;
  createdAt: Date;
}
