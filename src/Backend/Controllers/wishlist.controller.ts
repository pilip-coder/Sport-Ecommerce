import type { Request, Response } from "express";

import { AppError } from "../Core/errors";
import { AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import { addWishlistItem, getWishlist, removeWishlistItem } from "../Services/wishlist.service";

const getAuthenticatedUserId = (req: Request): number => {
  const authUser = (req as AuthenticatedRequest).authUser;

  if (!authUser) {
    throw new AppError("Authorization header is required.", 401);
  }

  return authUser.userId;
};

export const listWishlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const items = await getWishlist(userId);
  res.status(200).json({ items });
});

export const addItemToWishlist = asyncHandler<{ productId: string }>(
  async (req: Request<{ productId: string }>, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const items = await addWishlistItem(userId, req.params.productId);
    res.status(201).json({
      message: "Wishlist item added successfully.",
      items,
    });
  },
);

export const removeItemFromWishlist = asyncHandler<{ productId: string }>(
  async (req: Request<{ productId: string }>, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    const items = await removeWishlistItem(userId, req.params.productId);
    res.status(200).json({
      message: "Wishlist item removed successfully.",
      items,
    });
  },
);
