import { AppError } from "../Core/errors";
import type { AddCartItemDto, UpdateCartItemDto } from "../dto/cart";
import type { CartItemEntity } from "../Models/cart-item.model";
import type { CartEntity } from "../Models/cart.model";
import {
  clearCartItems,
  deleteCartItem,
  findCartByUserId,
  findCartItems,
  findFirstUserId,
  findOrCreateCart,
  findVariantByInput,
  updateCartItemQuantity,
  upsertCartItem,
} from "../Repositories/cart.repository";
import { seedPostmanCatalog } from "../Repositories/order.repository";

export interface CartDetail {
  cart: CartEntity;
  items: CartItemEntity[];
  totalAmount: number;
}

export const getCartDetail = async (userId?: number): Promise<CartDetail> => {
  const resolvedUserId = await resolveUserId(userId);
  const cart = await findOrCreateCart(resolvedUserId);
  return buildCartDetail(cart);
};

export const addItemToCart = async (payload: AddCartItemDto): Promise<CartDetail> => {
  const quantity = payload.quantity ?? 1;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AppError("Quantity must be greater than 0.", 400);
  }

  await seedPostmanCatalog();

  const variant = await findVariantByInput(payload);
  if (!variant) {
    throw new AppError("Product variant not found.", 404);
  }

  const userId = await resolveUserId(payload.userId);
  const cart = await findOrCreateCart(userId);
  await upsertCartItem(cart.id, variant.variantId, quantity);

  return buildCartDetail(cart);
};

export const changeCartItemQuantity = async (
  cartItemId: number,
  payload: UpdateCartItemDto,
): Promise<CartItemEntity> => {
  if (!Number.isFinite(payload.quantity) || payload.quantity <= 0) {
    throw new AppError("Quantity must be greater than 0.", 400);
  }

  const item = await updateCartItemQuantity(cartItemId, payload.quantity);
  if (!item) {
    throw new AppError("Cart item not found.", 404);
  }

  return item;
};

export const removeCartItem = async (cartItemId: number): Promise<void> => {
  const deleted = await deleteCartItem(cartItemId);
  if (!deleted) {
    throw new AppError("Cart item not found.", 404);
  }
};

export const clearCart = async (userId?: number): Promise<CartDetail> => {
  const resolvedUserId = await resolveUserId(userId);
  const cart = await findCartByUserId(resolvedUserId);

  if (!cart) {
    const newCart = await findOrCreateCart(resolvedUserId);
    return buildCartDetail(newCart);
  }

  await clearCartItems(cart.id);
  return buildCartDetail(cart);
};

const resolveUserId = async (userId?: number): Promise<number> => {
  if (userId && userId > 0) {
    return userId;
  }

  const firstUserId = await findFirstUserId();
  if (!firstUserId) {
    throw new AppError("Create or register a user before using the cart.", 400);
  }

  return firstUserId;
};

const buildCartDetail = async (cart: CartEntity): Promise<CartDetail> => {
  const items = await findCartItems(cart.id);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  return { cart, items, totalAmount };
};
