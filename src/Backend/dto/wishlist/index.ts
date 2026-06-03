export interface WishlistItemDto {
  id: number;
  userId: number;
  productId: number;
  productName: string;
  productSlug: string;
  productDescription: string | null;
  imageUrl: string | null;
  basePrice: number;
  createdAt: string;
  updatedAt: string;
}
