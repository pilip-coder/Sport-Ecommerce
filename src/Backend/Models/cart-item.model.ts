import type { RowDataPacket } from "mysql2/promise";

export interface CartItemRow extends RowDataPacket {
  cart_item_id: number;
  cart_id: number;
  variant_id: number;
  quantity: number;
  product_id?: number;
  product_name?: string;
  sku?: string | null;
  base_price?: number;
  extra_price?: number | null;
}

export interface CartItemEntity {
  id: number;
  cartId: number;
  productId: number;
  productVariantId: number;
  productName: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
