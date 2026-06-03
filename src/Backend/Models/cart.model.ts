import type { RowDataPacket } from "mysql2/promise";

export interface CartRow extends RowDataPacket {
  cart_item_id: number;
  user_id: number;
  product_id: number;
  product_variant_id: number;
  quantity: number;
  created_at: Date;
  updated_at: Date;
  product_name: string;
  product_slug: string;
  product_description: string | null;
  image_url: string | null;
  base_price: number;
  extra_price: number;
  sku: string;
}

export interface CartItemEntity {
  id: number;
  userId: number;
  productId: number;
  productVariantId: number;
  productName: string;
  productSlug: string;
  productDescription: string | null;
  imageUrl: string | null;
  sku: string;
  basePrice: number;
  extraPrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
