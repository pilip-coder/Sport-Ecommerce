import type { RowDataPacket } from "mysql2/promise";

export interface StockRow extends RowDataPacket {
  id: number;
  product_id: number;
  product_variant_id: number | null;
  quantity: number;
  reserved_quantity: number;
  warehouse_location: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface StockEntity {
  id: number;
  productId: number;
  productVariantId: number | null;
  quantity: number;
  reservedQuantity: number;
  warehouseLocation: string | null;
  createdAt: Date;
  updatedAt: Date;
}
