import type { RowDataPacket } from "mysql2/promise";

export interface ReviewRow extends RowDataPacket {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ReviewEntity {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}
