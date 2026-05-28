import { AppError } from "../Core/errors";
import type {
  CategoryDetailDto,
  CategoryListQueryDto,
  CategorySummaryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from "../dto/category";
import {
  assertCategoryExists,
  assertCategorySlugAvailable,
  countProductsByCategoryId,
  createCategoryInRepository,
  deleteCategoryInRepository,
  getCategoryDetailFromRepository,
  listCategoriesFromRepository,
  updateCategoryInRepository,
} from "../Repositories/category.repository";

export interface CategoryMutationResult {
  id: number;
  item: CategoryDetailDto | null;
}

const toPositiveCategoryId = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("Category ID must be a positive integer.", 400);
  }
  return parsed;
};

const toOptionalParentId = (
  value: string | number | null | undefined,
): number | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError("parentId must be a positive integer.", 400);
  }

  return parsed;
};

const normalizeName = (name: string | undefined): string => {
  const normalized = name?.trim() || "";
  if (normalized.length < 2) {
    throw new AppError("name must be at least 2 characters.", 400);
  }
  return normalized;
};

const slugify = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  if (!slug) {
    throw new AppError("Unable to generate a valid slug from category name.", 400);
  }

  return slug;
};

export const getCategoryList = async (query: CategoryListQueryDto): Promise<CategorySummaryDto[]> => {
  const search = query.search?.trim() || null;
  return listCategoriesFromRepository(search);
};

export const getCategoryDetail = async (slugOrId: string): Promise<CategoryDetailDto> => {
  const identifier = slugOrId.trim();
  if (!identifier) {
    throw new AppError("Category identifier is required.", 400);
  }

  const category = await getCategoryDetailFromRepository(identifier);
  if (!category) {
    throw new AppError("Category not found.", 404);
  }

  return category;
};

export const createCategory = async (payload: CreateCategoryDto): Promise<CategoryMutationResult> => {
  const name = normalizeName(payload.name);
  const slug = slugify(payload.slug?.trim() || name);
  const description = payload.description?.trim() || null;
  const parentId = toOptionalParentId(payload.parentId) ?? null;
  const status = payload.status?.trim() || undefined;
  const isActive = payload.isActive !== undefined
    ? ["true", "1", "yes"].includes(String(payload.isActive).trim().toLowerCase())
    : undefined;

  if (parentId != null) {
    await assertCategoryExists(parentId);
  }

  await assertCategorySlugAvailable(slug);

  const categoryId = await createCategoryInRepository({
    name,
    slug,
    description,
    parentId,
    status,
    isActive,
  });

  const item = await getCategoryDetailFromRepository(String(categoryId));
  return { id: categoryId, item };
};

export const updateCategory = async (
  categoryIdParam: string,
  payload: UpdateCategoryDto,
): Promise<CategoryMutationResult> => {
  const categoryId = toPositiveCategoryId(categoryIdParam);
  await assertCategoryExists(categoryId);

  const updateInput: Parameters<typeof updateCategoryInRepository>[1] = {};

  if (payload.name !== undefined) {
    updateInput.name = normalizeName(payload.name);
  }

  if (payload.slug !== undefined) {
    const nextSlug = slugify(payload.slug);
    await assertCategorySlugAvailable(nextSlug, categoryId);
    updateInput.slug = nextSlug;
  }

  if (payload.description !== undefined) {
    updateInput.description = payload.description?.trim() || null;
  }

  const parentId = toOptionalParentId(payload.parentId);
  if (parentId !== undefined) {
    if (parentId === categoryId) {
      throw new AppError("A category cannot be its own parent.", 400);
    }
    if (parentId !== null) {
      await assertCategoryExists(parentId);
    }
    updateInput.parentId = parentId;
  }

  if (payload.status !== undefined) {
    updateInput.status = payload.status.trim();
  }

  if (payload.isActive !== undefined) {
    const normalized = String(payload.isActive).trim().toLowerCase();
    updateInput.isActive = normalized === "true" || normalized === "1" || normalized === "yes";
  }

  if (Object.keys(updateInput).length === 0) {
    throw new AppError("No updatable fields were provided.", 400);
  }

  await updateCategoryInRepository(categoryId, updateInput);
  const item = await getCategoryDetailFromRepository(String(categoryId));

  return { id: categoryId, item };
};

export const deleteCategory = async (categoryIdParam: string): Promise<void> => {
  const categoryId = toPositiveCategoryId(categoryIdParam);
  await assertCategoryExists(categoryId);

  const productCount = await countProductsByCategoryId(categoryId);
  if (productCount > 0) {
    throw new AppError("Cannot delete category while products are linked to it.", 409);
  }

  await deleteCategoryInRepository(categoryId);
};
