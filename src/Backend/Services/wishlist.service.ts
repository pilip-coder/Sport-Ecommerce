import { AppError } from "../Core/errors";
import type { WishlistItemDto } from "../dto/wishlist";
import type { WishlistItemEntity } from "../Models/wishlist.model";
import {
  addWishlistItemToRepository,
  listWishlistItemsFromRepository,
  removeWishlistItemFromRepository,
} from "../Repositories/wishlist.repository";

const toPositiveInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsed;
};

const toWishlistItemDto = (item: WishlistItemEntity): WishlistItemDto => ({
  id: item.id,
  userId: item.userId,
  productId: item.productId,
  productName: item.productName,
  productSlug: item.productSlug,
  productDescription: item.productDescription,
  imageUrl: item.imageUrl,
  basePrice: item.basePrice,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

export const getWishlist = async (userId: number): Promise<WishlistItemDto[]> => {
  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError("Invalid user id.", 400);
  }

  const items = await listWishlistItemsFromRepository(userId);
  return items.map(toWishlistItemDto);
};

export const addWishlistItem = async (userId: number, productIdValue: string): Promise<WishlistItemDto[]> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  await addWishlistItemToRepository(userId, productId);
  return getWishlist(userId);
};

export const removeWishlistItem = async (userId: number, productIdValue: string): Promise<WishlistItemDto[]> => {
  const productId = toPositiveInteger(productIdValue, "Product id");
  await removeWishlistItemFromRepository(userId, productId);
  return getWishlist(userId);
};
