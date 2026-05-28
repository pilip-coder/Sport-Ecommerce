export interface CategoryListQueryDto {
  search?: string;
}

export interface CategoryProductPreviewDto {
  id: number;
  name: string;
  slug: string;
  basePrice: number;
  imageUrl: string | null;
  status: string | null;
}

export interface CategorySummaryDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  isActive: boolean;
  productCount: number;
}

export interface CategoryDetailDto extends CategorySummaryDto {
  products: CategoryProductPreviewDto[];
}

export interface CreateCategoryDto {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | number | null;
  status?: string;
  isActive?: string | boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | number | null;
  status?: string;
  isActive?: string | boolean;
}
