import type { RowDataPacket } from "mysql2/promise";

export interface OrderItemRow extends RowDataPacket {
  id: number;
  order_id: number;
  product_id: number;
  product_variant_id: number | null;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemEntity {
  id: number;
  orderId: number;
  productId: number;
  productVariantId: number | null;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
