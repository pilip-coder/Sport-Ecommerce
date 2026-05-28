import { Request, Response } from "express";

import { asyncHandler } from "../Core/utils";
import type { CreateProductDto, ProductListQueryDto, UpdateProductDto } from "../dto/catalog";
import {
  createProduct,
  deleteProduct,
  getProductDetail,
  getProductList,
  updateProduct,
} from "../Services/catalog.service";

interface ProductDetailParams {
  slugOrId: string;
}

export const listProducts = asyncHandler<never, unknown, never, ProductListQueryDto>(
  async (req: Request<never, unknown, never, ProductListQueryDto>, res: Response) => {
    const result = await getProductList(req.query);
    res.status(200).json(result);
  },
);

export const getProductBySlugOrId = asyncHandler<ProductDetailParams>(
  async (req: Request<ProductDetailParams>, res: Response) => {
    const result = await getProductDetail(req.params.slugOrId);
    res.status(200).json({ item: result });
  },
);

export const createProductByAdminOrStaff = asyncHandler<never, unknown, CreateProductDto>(
  async (req: Request<never, unknown, CreateProductDto>, res: Response) => {
    const uploadedImageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
    const result = await createProduct(req.body, uploadedImageUrl);
    res.status(201).json({
      message: "Product created successfully.",
      ...result,
    });
  },
);

export const updateProductByAdminOrStaff = asyncHandler<never, unknown, UpdateProductDto>(
  async (req: Request, res: Response) => {
    const uploadedImageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
    const result = await updateProduct(String(req.params.id ?? ""), req.body, uploadedImageUrl);
    res.status(200).json({
      message: "Product updated successfully.",
      ...result,
    });
  },
);

export const deleteProductByAdminOrStaff = asyncHandler(
  async (req: Request, res: Response) => {
    await deleteProduct(String(req.params.id ?? ""));
    res.status(200).json({
      message: "Product deleted successfully.",
    });
  },
);

export const searchProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const q = (req.query.q ?? "").toString();
    const result = await getProductList({
      page: (req.query.page ?? "1").toString(),
      limit: (req.query.limit ?? "12").toString(),
      search: q || undefined,
      category: req.query.category?.toString() ?? undefined,
      minPrice: req.query.minPrice?.toString() ?? undefined,
      maxPrice: req.query.maxPrice?.toString() ?? undefined,
      sort: req.query.sort?.toString() ?? undefined,
    } as ProductListQueryDto);

    res.status(200).json(result);
  },
);

export const getProductByCategory = asyncHandler(
  async (req: Request<{ categoryId: string }>, res: Response) => {
    const categoryId = String(req.params.categoryId ?? "");
    const result = await getProductList({
      page: (req.query.page ?? "1").toString(),
      limit: (req.query.limit ?? "12").toString(),
      search: req.query.q?.toString() ?? undefined,
      category: categoryId,
      minPrice: req.query.minPrice?.toString() ?? undefined,
      maxPrice: req.query.maxPrice?.toString() ?? undefined,
      sort: req.query.sort?.toString() ?? undefined,
    } as ProductListQueryDto);

    res.status(200).json(result);
  },
);

