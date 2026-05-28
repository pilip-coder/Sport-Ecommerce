import type { RowDataPacket } from "mysql2/promise";

export interface OrderItemRow extends RowDataPacket {
  order_item_id: number;
  order_id: number;
  variant_id: number;
  product_id?: number;
  product_name?: string;
  sku: string | null;
  quantity: number;
  price: number;
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
