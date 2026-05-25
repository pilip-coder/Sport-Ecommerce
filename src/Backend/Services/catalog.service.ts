import { AppError } from "../Core/errors";
import type {
  AdminCreateProductDto,
  AdminUpdateProductDto,
  BuyProductDto,
  FavoriteProductDto,
  ProductDetailDto,
  ProductListQueryDto,
  ProductSummaryDto,
  ProductVariantDto,
} from "../dto/catalog";
import {
  addFavoriteProduct,
  createAdminProduct,
  createProductOrder,
  deleteAdminProduct,
  findAvailableStock,
  findAdminProductById,
  findCategoryIdByName,
  findFavoriteProducts,
  findProductById,
  findProducts,
  findProductVariantById,
  findProductVariants,
  removeFavoriteProduct,
  updateAdminProduct,
  type ProductRecord,
  type ProductVariantRecord,
} from "../Repositories/catalog.repository";

const ALLOWED_CATEGORIES = new Set(["football", "basketball", "gym", "running"]);

const toPositiveInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsed;
};

const toPositiveNumber = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError(`${fieldName} must be greater than 0.`, 400);
  }

  return parsed;
};

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const createSlug = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `product-${Date.now()}`;
};

const parseAttributes = (attributesJson: string | null): unknown => {
  if (!attributesJson) {
    return null;
  }

  try {
    return JSON.parse(attributesJson);
  } catch {
    return attributesJson;
  }
};

const toProductSummary = (product: ProductRecord): ProductSummaryDto => ({
  id: Number(product.id),
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: Number(product.basePrice),
  imageUrl: product.imageUrl,
  category: product.categoryName,
});

const toProductVariant = (variant: ProductVariantRecord): ProductVariantDto => ({
  id: Number(variant.id),
  sku: variant.sku,
  name: variant.name,
  price: Number(variant.price),
  attributes: parseAttributes(variant.attributesJson),
});

export const listProducts = async (query: ProductListQueryDto): Promise<ProductSummaryDto[]> => {
  const category = query.category?.trim();

  if (category && !ALLOWED_CATEGORIES.has(category.toLowerCase())) {
    throw new AppError("Category must be one of: Football, Basketball, Gym, Running.", 400);
  }

  const products = await findProducts({
    search: query.search,
    category,
  });

  return products.map(toProductSummary);
};

export const listAdminProducts = async (query: ProductListQueryDto): Promise<ProductSummaryDto[]> => {
  const category = query.category?.trim();

  if (category && !ALLOWED_CATEGORIES.has(category.toLowerCase())) {
    throw new AppError("Category must be one of: Football, Basketball, Gym, Running.", 400);
  }

  const products = await findProducts({
    search: query.search,
    category,
    includeInactive: true,
  });

  return products.map(toProductSummary);
};

export const getProductDetails = async (productIdValue: string): Promise<ProductDetailDto> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  const product = await findProductById(productId);

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const [variants, availableQuantity] = await Promise.all([
    findProductVariants(productId),
    findAvailableStock(productId, null),
  ]);

  return {
    ...toProductSummary(product),
    variants: variants.map(toProductVariant),
    availableQuantity,
  };
};

export const getAdminProductDetails = async (productIdValue: string): Promise<ProductDetailDto> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  const product = await findAdminProductById(productId);

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const [variants, availableQuantity] = await Promise.all([
    findProductVariants(productId),
    findAvailableStock(productId, null),
  ]);

  return {
    ...toProductSummary(product),
    variants: variants.map(toProductVariant),
    availableQuantity,
  };
};

const resolveCategoryId = async (
  categoryName: string | null | undefined,
  categoryId: number | null | undefined,
): Promise<number | null> => {
  if (categoryId != null) {
    return toPositiveInteger(categoryId, "Category id");
  }

  const normalizedCategory = normalizeOptionalText(categoryName);
  if (!normalizedCategory) {
    return null;
  }

  if (!ALLOWED_CATEGORIES.has(normalizedCategory.toLowerCase())) {
    throw new AppError("Category must be one of: Football, Basketball, Gym, Running.", 400);
  }

  const resolvedCategoryId = await findCategoryIdByName(normalizedCategory);
  if (resolvedCategoryId == null) {
    throw new AppError(`Category '${normalizedCategory}' does not exist.`, 400);
  }

  return resolvedCategoryId;
};

export const addAdminProduct = async (payload: AdminCreateProductDto): Promise<ProductSummaryDto> => {
  const name = normalizeOptionalText(payload.name);

  if (!name || name.length < 2) {
    throw new AppError("Product name must be at least 2 characters.", 400);
  }

  const categoryId = await resolveCategoryId(payload.category, payload.categoryId);
  const product = await createAdminProduct({
    categoryId,
    name,
    slug: createSlug(name),
    description: normalizeOptionalText(payload.description),
    basePrice: toPositiveNumber(payload.price, "Price"),
    imageUrl: normalizeOptionalText(payload.imageUrl),
    isActive: payload.isActive ?? true,
  });

  return toProductSummary(product);
};

export const editAdminProduct = async (
  productIdValue: string,
  payload: AdminUpdateProductDto,
): Promise<ProductSummaryDto> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  const existingProduct = await findAdminProductById(productId);

  if (!existingProduct) {
    throw new AppError("Product not found.", 404);
  }

  const name = payload.name == null ? undefined : normalizeOptionalText(payload.name);
  if (name != null && name.length < 2) {
    throw new AppError("Product name must be at least 2 characters.", 400);
  }

  const shouldUpdateCategory = "category" in payload || "categoryId" in payload;
  const categoryId = shouldUpdateCategory
    ? await resolveCategoryId(payload.category, payload.categoryId)
    : undefined;

  const product = await updateAdminProduct(productId, {
    categoryId,
    name: name ?? undefined,
    slug: name ? createSlug(name) : undefined,
    description: "description" in payload ? normalizeOptionalText(payload.description) : undefined,
    basePrice: payload.price == null ? undefined : toPositiveNumber(payload.price, "Price"),
    imageUrl: "imageUrl" in payload ? normalizeOptionalText(payload.imageUrl) : undefined,
    isActive: payload.isActive,
  });

  return toProductSummary(product);
};

export const removeAdminProduct = async (productIdValue: string): Promise<void> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  const deleted = await deleteAdminProduct(productId);

  if (!deleted) {
    throw new AppError("Product not found.", 404);
  }
};

export interface BuyProductResult {
  orderId: number;
  productId: number;
  productVariantId: number | null;
  quantity: number;
  totalAmount: number;
}

export const buyProduct = async (
  productIdValue: string,
  payload: BuyProductDto,
): Promise<BuyProductResult> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  const userId = toPositiveInteger(payload.userId, "User id");
  const quantity = payload.quantity == null ? 1 : toPositiveInteger(payload.quantity, "Quantity");
  const productVariantId = payload.productVariantId == null
    ? null
    : toPositiveInteger(payload.productVariantId, "Product variant id");
  const addressId = payload.addressId == null ? null : toPositiveInteger(payload.addressId, "Address id");

  const product = await findProductById(productId);
  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const variant = productVariantId == null
    ? null
    : await findProductVariantById(productId, productVariantId);

  if (productVariantId != null && !variant) {
    throw new AppError("Product variant not found.", 404);
  }

  const availableQuantity = await findAvailableStock(productId, productVariantId);
  if (availableQuantity < quantity) {
    throw new AppError("Not enough stock is available for this product.", 409);
  }

  const orderId = await createProductOrder({
    userId,
    product,
    variant,
    quantity,
    addressId,
  });
  const unitPrice = Number(variant?.price ?? product.basePrice);

  return {
    orderId,
    productId,
    productVariantId,
    quantity,
    totalAmount: unitPrice * quantity,
  };
};

export const addProductToFavorites = async (
  productIdValue: string,
  payload: FavoriteProductDto,
): Promise<void> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  const userId = toPositiveInteger(payload.userId, "User id");
  const product = await findProductById(productId);

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  await addFavoriteProduct(userId, productId);
};

export const removeProductFromFavorites = async (
  productIdValue: string,
  payload: FavoriteProductDto,
): Promise<void> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  const userId = toPositiveInteger(payload.userId, "User id");

  await removeFavoriteProduct(userId, productId);
};

export const listFavoriteProducts = async (userIdValue: string): Promise<ProductSummaryDto[]> => {
  const userId = toPositiveInteger(userIdValue, "User id");
  const products = await findFavoriteProducts(userId);

  return products.map(toProductSummary);
};
