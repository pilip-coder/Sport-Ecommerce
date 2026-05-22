import type { RowDataPacket } from "mysql2/promise";

export interface CartRow extends RowDataPacket {
  id: number;
  user_id: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CartEntity {
  id: number;
  userId: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
