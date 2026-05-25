import { Request, Response } from "express";

import { asyncHandler } from "../Core/utils";
import type { BuyProductDto, FavoriteProductDto, ProductListQueryDto } from "../dto/catalog";
import {
  addProductToFavorites,
  buyProduct,
  getProductDetails,
  listFavoriteProducts,
  listProducts,
  removeProductFromFavorites,
} from "../Services/catalog.service";

interface ProductParams {
  productId: string;
}

interface UserParams {
  userId: string;
}

export const getProducts = asyncHandler<
  never,
  unknown,
  never,
  ProductListQueryDto
>(async (req: Request<never, unknown, never, ProductListQueryDto>, res: Response) => {
  const products = await listProducts(req.query);
  res.status(200).json({ products });
});

export const getProduct = asyncHandler<ProductParams>(async (req, res) => {
  const product = await getProductDetails(req.params.productId);
  res.status(200).json({ product });
});

export const createProductPurchase = asyncHandler<ProductParams, unknown, BuyProductDto>(
  async (req: Request<ProductParams, unknown, BuyProductDto>, res: Response) => {
    const order = await buyProduct(req.params.productId, req.body);
    res.status(201).json({
      message: "Product purchased successfully.",
      order,
    });
  },
);

export const createFavoriteProduct = asyncHandler<ProductParams, unknown, FavoriteProductDto>(
  async (req: Request<ProductParams, unknown, FavoriteProductDto>, res: Response) => {
    await addProductToFavorites(req.params.productId, req.body);
    res.status(201).json({ message: "Product added to favorites." });
  },
);

export const deleteFavoriteProduct = asyncHandler<ProductParams, unknown, FavoriteProductDto>(
  async (req: Request<ProductParams, unknown, FavoriteProductDto>, res: Response) => {
    await removeProductFromFavorites(req.params.productId, req.body);
    res.status(200).json({ message: "Product removed from favorites." });
  },
);

export const getFavoriteProducts = asyncHandler<UserParams>(async (req, res) => {
  const products = await listFavoriteProducts(req.params.userId);
  res.status(200).json({ products });
});
