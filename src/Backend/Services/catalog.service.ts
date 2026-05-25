import { AppError } from "../Core/errors";
import type {
  BuyProductDto,
  FavoriteProductDto,
  ProductDetailDto,
  ProductListQueryDto,
  ProductSummaryDto,
  ProductVariantDto,
} from "../dto/catalog";
import {
  addFavoriteProduct,
  createProductOrder,
  findAvailableStock,
  findFavoriteProducts,
  findProductById,
  findProducts,
  findProductVariantById,
  findProductVariants,
  removeFavoriteProduct,
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
