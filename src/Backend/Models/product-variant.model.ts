import type { RowDataPacket } from "mysql2/promise";

export interface ProductVariantRow extends RowDataPacket {
  id: number;
  product_id: number;
  sku: string;
  name: string | null;
  price: number;
  attributes_json: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ProductVariantEntity {
  id: number;
  productId: number;
  sku: string;
  name: string | null;
  price: number;
  attributesJson: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
