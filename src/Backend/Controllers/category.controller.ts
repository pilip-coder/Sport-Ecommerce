import { Request, Response } from "express";

import { asyncHandler } from "../Core/utils";
import type { CategoryListQueryDto, CreateCategoryDto, UpdateCategoryDto } from "../dto/category";
import {
  createCategory,
  deleteCategory,
  getCategoryDetail,
  getCategoryList,
  updateCategory,
} from "../Services/category.service";

interface CategoryDetailParams {
  slugOrId: string;
}

export const listCategories = asyncHandler<never, unknown, never, CategoryListQueryDto>(
  async (req: Request<never, unknown, never, CategoryListQueryDto>, res: Response) => {
    const result = await getCategoryList(req.query);
    res.status(200).json({ items: result });
  },
);

export const getCategoryBySlugOrId = asyncHandler<CategoryDetailParams>(
  async (req: Request<CategoryDetailParams>, res: Response) => {
    const result = await getCategoryDetail(req.params.slugOrId);
    res.status(200).json({ item: result });
  },
);

export const createCategoryByAdminOrStaff = asyncHandler<never, unknown, CreateCategoryDto>(
  async (req: Request<never, unknown, CreateCategoryDto>, res: Response) => {
    const result = await createCategory(req.body);
    res.status(201).json({
      message: "Category created successfully.",
      ...result,
    });
  },
);

export const updateCategoryByAdminOrStaff = asyncHandler<never, unknown, UpdateCategoryDto>(
  async (req: Request, res: Response) => {
    const result = await updateCategory(String(req.params.id ?? ""), req.body);
    res.status(200).json({
      message: "Category updated successfully.",
      ...result,
    });
  },
);

export const deleteCategoryByAdminOrStaff = asyncHandler(
  async (req: Request, res: Response) => {
    await deleteCategory(String(req.params.id ?? ""));
    res.status(200).json({
      message: "Category deleted successfully.",
    });
  },
);
