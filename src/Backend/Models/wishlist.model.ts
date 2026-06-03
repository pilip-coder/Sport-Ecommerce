import type { RowDataPacket } from "mysql2/promise";

export interface WishlistRow extends RowDataPacket {
  wishlist_item_id: number;
  user_id: number;
  product_id: number;
  created_at: Date;
  updated_at: Date;
  product_name: string;
  product_slug: string;
  product_description: string | null;
  image_url: string | null;
  base_price: number;
}

export interface WishlistItemEntity {
  id: number;
  userId: number;
  productId: number;
  productName: string;
  productSlug: string;
  productDescription: string | null;
  imageUrl: string | null;
  basePrice: number;
  createdAt: Date;
  updatedAt: Date;
}
