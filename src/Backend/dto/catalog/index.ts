export interface ProductSummaryDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
}

export interface ProductDetailDto extends ProductSummaryDto {
  variants: ProductVariantDto[];
  availableQuantity: number;
}

export interface ProductVariantDto {
  id: number;
  sku: string;
  name: string | null;
  price: number;
  attributes: unknown;
}

export interface ProductListQueryDto {
  search?: string;
  category?: string;
}

export interface BuyProductDto {
  userId: number;
  quantity?: number;
  productVariantId?: number;
  addressId?: number | null;
}

export interface FavoriteProductDto {
  userId: number;
}
