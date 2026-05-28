import { AppError } from "../Core/errors";
import { CreateProductDto, UpdateProductDto } from "../dto/catalog";
import { CatalogRepository } from "../Repositories/catalog.repository";
import { PRODUCT_CATEGORIES, Product, ProductCategory } from "../Models/product.model";
import {
  requireNonNegativeInteger,
  requirePositiveNumber,
  requireString,
  toOptionalString,
} from "../Core/utils";

interface CatalogQuery {
  search?: string;
  category?: string;
  includeDrafts?: boolean;
}

const ensureCategory = (category: unknown): ProductCategory => {
  const value = requireString(category, "Category") as ProductCategory;

  if (!PRODUCT_CATEGORIES.includes(value)) {
    throw new AppError(`Category must be one of: ${PRODUCT_CATEGORIES.join(", ")}.`, 400);
  }

  return value;
};

export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  listProducts(query: CatalogQuery): Product[] {
    const category = query.category ? ensureCategory(query.category) : undefined;

    return this.catalogRepository.findAll({
      search: query.search?.trim() || undefined,
      category,
      includeDrafts: Boolean(query.includeDrafts),
    });
  }

  getProduct(productId: number): Product {
    const product = this.catalogRepository.findById(productId);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    return product;
  }

  getCategories(): readonly ProductCategory[] {
    return PRODUCT_CATEGORIES;
  }

  createProduct(payload: CreateProductDto): Product {
    return this.catalogRepository.create({
      productName: requireString(payload.productName, "Product name"),
      price: requirePositiveNumber(payload.price, "Price"),
      category: ensureCategory(payload.category),
      description: toOptionalString(payload.description) ?? "",
      imageUrl: toOptionalString(payload.imageUrl) ?? "",
      stockQuantity: requireNonNegativeInteger(payload.stockQuantity, "Stock quantity"),
      status: payload.status ?? "active",
    });
  }

  updateProduct(productId: number, payload: UpdateProductDto): Product {
    const current = this.getProduct(productId);

    const updated = this.catalogRepository.update(productId, {
      productName: payload.productName ? requireString(payload.productName, "Product name") : current.productName,
      price: payload.price !== undefined ? requirePositiveNumber(payload.price, "Price") : current.price,
      category: payload.category ? ensureCategory(payload.category) : current.category,
      description: payload.description !== undefined ? payload.description.trim() : current.description,
      imageUrl: payload.imageUrl !== undefined ? payload.imageUrl.trim() : current.imageUrl,
      stockQuantity:
        payload.stockQuantity !== undefined
          ? requireNonNegativeInteger(payload.stockQuantity, "Stock quantity")
          : current.stockQuantity,
      status: payload.status ?? current.status,
    });

    if (!updated) {
      throw new AppError("Product not found.", 404);
    }

    return updated;
  }

  deleteProduct(productId: number): void {
    const deleted = this.catalogRepository.remove(productId);
    if (!deleted) {
      throw new AppError("Product not found.", 404);
    }
  }

  listFavorites(userId: number) {
    return this.catalogRepository
      .listFavorites(userId)
      .map((favorite) => ({
        ...favorite,
        product: this.catalogRepository.findById(favorite.productId),
      }))
      .filter((favorite) => favorite.product);
  }

  addFavorite(userId: number, productId: number) {
    this.getProduct(productId);

    const existing = this.catalogRepository.findFavorite(userId, productId);
    if (existing) {
      return existing;
    }

    return this.catalogRepository.createFavorite(userId, productId);
  }

  removeFavorite(userId: number, favoriteId: number): void {
    const removed = this.catalogRepository.removeFavorite(userId, favoriteId);
    if (!removed) {
      throw new AppError("Favorite not found.", 404);
    }
  }
}
