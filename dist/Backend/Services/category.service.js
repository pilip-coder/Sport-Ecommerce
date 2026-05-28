"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryDetail = exports.getCategoryList = void 0;
const errors_1 = require("../Core/errors");
const category_repository_1 = require("../Repositories/category.repository");
const toPositiveCategoryId = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new errors_1.AppError("Category ID must be a positive integer.", 400);
    }
    return parsed;
};
const toOptionalParentId = (value) => {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value === "") {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new errors_1.AppError("parentId must be a positive integer.", 400);
    }
    return parsed;
};
const normalizeName = (name) => {
    const normalized = name?.trim() || "";
    if (normalized.length < 2) {
        throw new errors_1.AppError("name must be at least 2 characters.", 400);
    }
    return normalized;
};
const slugify = (value) => {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    if (!slug) {
        throw new errors_1.AppError("Unable to generate a valid slug from category name.", 400);
    }
    return slug;
};
const getCategoryList = async (query) => {
    const search = query.search?.trim() || null;
    return (0, category_repository_1.listCategoriesFromRepository)(search);
};
exports.getCategoryList = getCategoryList;
const getCategoryDetail = async (slugOrId) => {
    const identifier = slugOrId.trim();
    if (!identifier) {
        throw new errors_1.AppError("Category identifier is required.", 400);
    }
    const category = await (0, category_repository_1.getCategoryDetailFromRepository)(identifier);
    if (!category) {
        throw new errors_1.AppError("Category not found.", 404);
    }
    return category;
};
exports.getCategoryDetail = getCategoryDetail;
const createCategory = async (payload) => {
    const name = normalizeName(payload.name);
    const slug = slugify(payload.slug?.trim() || name);
    const description = payload.description?.trim() || null;
    const parentId = toOptionalParentId(payload.parentId) ?? null;
    const status = payload.status?.trim() || undefined;
    const isActive = payload.isActive !== undefined
        ? ["true", "1", "yes"].includes(String(payload.isActive).trim().toLowerCase())
        : undefined;
    if (parentId != null) {
        await (0, category_repository_1.assertCategoryExists)(parentId);
    }
    await (0, category_repository_1.assertCategorySlugAvailable)(slug);
    const categoryId = await (0, category_repository_1.createCategoryInRepository)({
        name,
        slug,
        description,
        parentId,
        status,
        isActive,
    });
    const item = await (0, category_repository_1.getCategoryDetailFromRepository)(String(categoryId));
    return { id: categoryId, item };
};
exports.createCategory = createCategory;
const updateCategory = async (categoryIdParam, payload) => {
    const categoryId = toPositiveCategoryId(categoryIdParam);
    await (0, category_repository_1.assertCategoryExists)(categoryId);
    const updateInput = {};
    if (payload.name !== undefined) {
        updateInput.name = normalizeName(payload.name);
    }
    if (payload.slug !== undefined) {
        const nextSlug = slugify(payload.slug);
        await (0, category_repository_1.assertCategorySlugAvailable)(nextSlug, categoryId);
        updateInput.slug = nextSlug;
    }
    if (payload.description !== undefined) {
        updateInput.description = payload.description?.trim() || null;
    }
    const parentId = toOptionalParentId(payload.parentId);
    if (parentId !== undefined) {
        if (parentId === categoryId) {
            throw new errors_1.AppError("A category cannot be its own parent.", 400);
        }
        if (parentId !== null) {
            await (0, category_repository_1.assertCategoryExists)(parentId);
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
        throw new errors_1.AppError("No updatable fields were provided.", 400);
    }
    await (0, category_repository_1.updateCategoryInRepository)(categoryId, updateInput);
    const item = await (0, category_repository_1.getCategoryDetailFromRepository)(String(categoryId));
    return { id: categoryId, item };
};
exports.updateCategory = updateCategory;
const deleteCategory = async (categoryIdParam) => {
    const categoryId = toPositiveCategoryId(categoryIdParam);
    await (0, category_repository_1.assertCategoryExists)(categoryId);
    const productCount = await (0, category_repository_1.countProductsByCategoryId)(categoryId);
    if (productCount > 0) {
        throw new errors_1.AppError("Cannot delete category while products are linked to it.", 409);
    }
    await (0, category_repository_1.deleteCategoryInRepository)(categoryId);
};
exports.deleteCategory = deleteCategory;
