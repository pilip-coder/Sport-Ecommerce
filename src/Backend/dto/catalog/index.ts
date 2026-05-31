export type ProductSortBy = "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc" | "rating_desc";

export interface ProductListQueryDto {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
}

export interface ProductListRequest {
  page: number;
  limit: number;
  search: string | null;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  sort: ProductSortBy;
}

export interface ProductSummaryDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  price: number;
  imageUrl: string | null;
  category: {
    id: number | null;
    name: string | null;
    slug: string | null;
  };
  rating: {
    average: number;
    count: number;
  };
}

export interface ProductVariantDto {
  id: number;
  productId: number;
  sku: string;
  name: string | null;
  price: number;
  attributes: Record<string, unknown> | null;
}

export interface ProductReviewPreviewDto {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  userName: string | null;
  createdAt: string;
}

export interface ProductDetailDto extends ProductSummaryDto {
  createdAt: string;
  updatedAt: string;
  variants: ProductVariantDto[];
  reviews: ProductReviewPreviewDto[];
}

export interface CreateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  basePrice?: string | number;
  categoryId?: string | number | null;
  imageUrl?: string;
  status?: string;
  quantity?: string | number;
  sku?: string;
  variantName?: string;
}

export interface UpdateProductDto {
  name?: string;
  slug?: string;
  description?: string;
  basePrice?: string | number;
  categoryId?: string | number | null;
  imageUrl?: string | null;
  isActive?: string | boolean;
  status?: string;
}
