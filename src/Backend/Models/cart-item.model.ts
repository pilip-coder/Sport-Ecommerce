import type { RowDataPacket } from "mysql2/promise";

export interface CartItemRow extends RowDataPacket {
  id: number;
  cart_id: number;
  product_id: number;
  product_variant_id: number | null;
  quantity: number;
  unit_price: number;
  created_at: Date;
  updated_at: Date;
}

export interface CartItemEntity {
  id: number;
  cartId: number;
  productId: number;
  productVariantId: number | null;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
