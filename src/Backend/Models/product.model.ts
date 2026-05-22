import type { RowDataPacket } from "mysql2/promise";

export interface ProductRow extends RowDataPacket {
  id: number;
  category_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductEntity {
  id: number;
  categoryId: number | null;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
