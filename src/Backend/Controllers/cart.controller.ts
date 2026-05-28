import type { Request, Response } from "express";

import { asyncHandler } from "../Core/utils";
import type { AddCartItemDto, UpdateCartItemDto } from "../dto/cart";
import {
  addItemToCart,
  changeCartItemQuantity,
  clearCart,
  getCartDetail,
  removeCartItem,
} from "../Services/cart.service";

const toOptionalPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const getCart = asyncHandler<never, unknown, never, { userId?: string }>(
  async (req: Request<never, unknown, never, { userId?: string }>, res: Response) => {
    const result = await getCartDetail(toOptionalPositiveNumber(req.query.userId));
    res.status(200).json(result);
  },
);

export const addCartItem = asyncHandler<never, unknown, AddCartItemDto>(
  async (req: Request<never, unknown, AddCartItemDto>, res: Response) => {
    const result = await addItemToCart(req.body);
    res.status(201).json({
      message: "Item added to cart successfully.",
      ...result,
    });
  },
);

export const updateCartItem = asyncHandler<{ id: string }, unknown, UpdateCartItemDto>(
  async (req: Request<{ id: string }, unknown, UpdateCartItemDto>, res: Response) => {
    const item = await changeCartItemQuantity(Number(req.params.id), req.body);
    res.status(200).json({
      message: "Cart item updated successfully.",
      item,
    });
  },
);

export const deleteCartItemById = asyncHandler<{ id: string }>(
  async (req: Request<{ id: string }>, res: Response) => {
    await removeCartItem(Number(req.params.id));
    res.status(200).json({ message: "Cart item removed successfully." });
  },
);

export const clearUserCart = asyncHandler<never, unknown, never, { userId?: string }>(
  async (req: Request<never, unknown, never, { userId?: string }>, res: Response) => {
    const result = await clearCart(toOptionalPositiveNumber(req.query.userId));
    res.status(200).json({
      message: "Cart cleared successfully.",
      ...result,
    });
  },
);
