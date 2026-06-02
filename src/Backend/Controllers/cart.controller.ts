import type { Request, Response } from "express";

import { AppError } from "../Core/errors";
import { AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import type { AddCartItemDto, UpdateCartItemDto } from "../dto/cart";
import type { CreateOrderDto } from "../dto/order";
import { addCartItem, checkoutCart, clearCart, deleteCartItem, getCart, updateCartItem } from "../Services/cart.service";

const getAuthenticatedUserId = (req: Request): number => {
  const authUser = (req as AuthenticatedRequest).authUser;

  if (!authUser) {
    throw new AppError("Authorization header is required.", 401);
  }

  return authUser.userId;
};

export const getCartItems = asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const cart = await getCart(userId);
  res.status(200).json({ cart });
});

export const addItemToCart = asyncHandler<never, unknown, AddCartItemDto>(
  async (req: Request<never, unknown, AddCartItemDto>, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const cart = await addCartItem(userId, req.body);
    res.status(201).json({
      message: "Cart item added successfully.",
      cart,
    });
  },
);

export const updateItemInCart = asyncHandler<{ itemId: string }, unknown, UpdateCartItemDto>(
  async (req: Request<{ itemId: string }, unknown, UpdateCartItemDto>, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const cart = await updateCartItem(userId, req.params.itemId, req.body);
    res.status(200).json({
      message: "Cart item updated successfully.",
      cart,
    });
  },
);

export const removeItemFromCart = asyncHandler<{ itemId: string }>(
  async (req: Request<{ itemId: string }>, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const cart = await deleteCartItem(userId, req.params.itemId);
    res.status(200).json({
      message: "Cart item deleted successfully.",
      cart,
    });
  },
);

export const emptyCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  await clearCart(userId);
  res.status(200).json({
    message: "Cart cleared successfully.",
    cart: await getCart(userId),
  });
});

export const checkout = asyncHandler<never, unknown, CreateOrderDto>(
  async (req: Request<never, unknown, CreateOrderDto>, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const result = await checkoutCart(userId, req.body);
    res.status(201).json({
      message: "Checkout completed successfully.",
      order: result.order,
      items: result.items,
      cart: result.cart,
    });
  },
);
