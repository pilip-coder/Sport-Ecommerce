export interface AddCartItemDto {
  productId?: number;
  productVariantId?: number | null;
  quantity?: number;
}

export interface UpdateCartItemDto {
  quantity?: number;
}

export interface CartItemDto {
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
  createdAt: string;
  updatedAt: string;
}

export interface CartSummaryDto {
  items: CartItemDto[];
  subtotal: number;
  totalQuantity: number;
  itemCount: number;
}
