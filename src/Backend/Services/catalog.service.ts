import { AppError } from "../Core/errors";
import type {
  CreateProductDto,
  ProductDetailDto,
  ProductListQueryDto,
  ProductListRequest,
  ProductSortBy,
  ProductSummaryDto,
  UpdateProductDto,
} from "../dto/catalog";
import {
  assertProductExists,
  assertProductSlugAvailable,
  createProductInRepository,
  getProductDetailFromRepository,
  listProductsFromRepository,
  softDeleteProductInRepository,
  updateProductInRepository,
} from "../Repositories/catalog.repository";

const ALLOWED_SORTS: ProductSortBy[] = [
  "newest",
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "rating_desc",
];

export interface ProductListResult {
  items: ProductSummaryDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductMutationResult {
  id: number;
  item: ProductDetailDto | null;
}

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const toNullableNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
};

const toPositiveProductId = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("Product ID must be a positive integer.", 400);
  }
  return parsed;
};

const toPrice = (value: string | number | undefined, fieldName: string): number => {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${fieldName} is required.`, 400);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} must be a non-negative number.`, 400);
  }

  return parsed;
};

const toOptionalPrice = (value: string | number | undefined): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError("basePrice must be a non-negative number.", 400);
  }

  return parsed;
};

const toOptionalCategoryId = (
  value: string | number | null | undefined,
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("categoryId must be a positive integer.", 400);
  }

  return parsed;
};

const slugify = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  if (!slug) {
    throw new AppError("Unable to generate a valid slug from product name.", 400);
  }

  return slug;
};

const normalizeName = (name: string | undefined): string => {
  const normalized = name?.trim() || "";
  if (normalized.length < 2) {
    throw new AppError("name must be at least 2 characters.", 400);
  }
  return normalized;
};

const normalizeListInput = (query: ProductListQueryDto): ProductListRequest => {
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(toPositiveInt(query.limit, 12), 50);

  const search = query.search?.trim() || null;
  const category = query.category?.trim() || null;
  const minPrice = toNullableNumber(query.minPrice);
  const maxPrice = toNullableNumber(query.maxPrice);

  if (minPrice != null && minPrice < 0) {
    throw new AppError("minPrice must be a positive number.", 400);
  }

  if (maxPrice != null && maxPrice < 0) {
    throw new AppError("maxPrice must be a positive number.", 400);
  }

  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    throw new AppError("minPrice cannot be greater than maxPrice.", 400);
  }

  const requestedSort = query.sort?.trim() as ProductSortBy | undefined;
  const sort = requestedSort && ALLOWED_SORTS.includes(requestedSort) ? requestedSort : "newest";

  return {
    page,
    limit,
    search,
    category,
    minPrice,
    maxPrice,
    sort,
  };
};

export const getProductList = async (query: ProductListQueryDto): Promise<ProductListResult> => {
  const normalizedInput = normalizeListInput(query);
  const { items, total } = await listProductsFromRepository(normalizedInput);
  const totalPages = total === 0 ? 0 : Math.ceil(total / normalizedInput.limit);

  return {
    items,
    pagination: {
      page: normalizedInput.page,
      limit: normalizedInput.limit,
      total,
      totalPages,
    },
  };
};

export const getProductDetail = async (slugOrId: string): Promise<ProductDetailDto> => {
  const identifier = slugOrId.trim();
  if (!identifier) {
    throw new AppError("Product identifier is required.", 400);
  }

  const product = await getProductDetailFromRepository(identifier);
  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return product;
};

export const createProduct = async (
  payload: CreateProductDto,
  uploadedImageUrl: string | null,
): Promise<ProductMutationResult> => {
  const name = normalizeName(payload.name);
  const basePrice = toPrice(payload.basePrice, "basePrice");
  const categoryId = toOptionalCategoryId(payload.categoryId) ?? null;
  const slug = slugify(payload.slug?.trim() || name);
  const description = payload.description?.trim() || null;
  const imageUrl = uploadedImageUrl || payload.imageUrl?.trim() || null;
  const status = payload.status?.trim() || undefined;

  await assertProductSlugAvailable(slug);
  const productId = await createProductInRepository({
    name,
    slug,
    description,
    basePrice,
    categoryId,
    imageUrl,
    status,
  });

  const item = await getProductDetailFromRepository(String(productId));
  return { id: productId, item };
};

export const updateProduct = async (
  productIdParam: string,
  payload: UpdateProductDto,
  uploadedImageUrl: string | null,
): Promise<ProductMutationResult> => {
  const productId = toPositiveProductId(productIdParam);
  await assertProductExists(productId);

  const updateInput: Parameters<typeof updateProductInRepository>[1] = {};

  if (payload.name !== undefined) {
    updateInput.name = normalizeName(payload.name);
  }

  if (payload.slug !== undefined) {
    const nextSlug = slugify(payload.slug);
    await assertProductSlugAvailable(nextSlug, productId);
    updateInput.slug = nextSlug;
  }

  if (payload.description !== undefined) {
    updateInput.description = payload.description?.trim() || null;
  }

  const basePrice = toOptionalPrice(payload.basePrice);
  if (basePrice !== undefined) {
    updateInput.basePrice = basePrice;
  }

  const categoryId = toOptionalCategoryId(payload.categoryId);
  if (categoryId !== undefined) {
    updateInput.categoryId = categoryId;
  }

  if (payload.imageUrl !== undefined) {
    updateInput.imageUrl = payload.imageUrl?.trim() || null;
  }

  if (uploadedImageUrl) {
    updateInput.imageUrl = uploadedImageUrl;
  }

  if (payload.isActive !== undefined) {
    const normalized = String(payload.isActive).trim().toLowerCase();
    updateInput.isActive = normalized === "true" || normalized === "1";
  }

  if (payload.status !== undefined) {
    updateInput.status = payload.status.trim();
  }

  if (Object.keys(updateInput).length === 0) {
    throw new AppError("No updatable fields were provided.", 400);
  }

  await updateProductInRepository(productId, updateInput);
  const item = await getProductDetailFromRepository(String(productId));

  return { id: productId, item };
};

export const deleteProduct = async (productIdParam: string): Promise<void> => {
  const productId = toPositiveProductId(productIdParam);
  await assertProductExists(productId);
  await softDeleteProductInRepository(productId);
};
