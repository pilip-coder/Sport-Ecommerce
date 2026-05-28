export interface AddCartItemDto {
  userId?: number;
  productVariantId?: number;
  variantId?: number;
  productId?: number;
  quantity?: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}
