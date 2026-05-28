"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.updateProduct = exports.createProduct = exports.getProductDetail = exports.getProductList = void 0;
const errors_1 = require("../Core/errors");
const catalog_repository_1 = require("../Repositories/catalog.repository");
const ALLOWED_SORTS = [
    "newest",
    "price_asc",
    "price_desc",
    "name_asc",
    "name_desc",
    "rating_desc",
];
const toPositiveInt = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
};
const toNullableNumber = (value) => {
    if (!value) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return parsed;
};
const toPositiveProductId = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new errors_1.AppError("Product ID must be a positive integer.", 400);
    }
    return parsed;
};
const toPrice = (value, fieldName) => {
    if (value === undefined || value === null || value === "") {
        throw new errors_1.AppError(`${fieldName} is required.`, 400);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new errors_1.AppError(`${fieldName} must be a non-negative number.`, 400);
    }
    return parsed;
};
const toOptionalPrice = (value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new errors_1.AppError("basePrice must be a non-negative number.", 400);
    }
    return parsed;
};
const toOptionalCategoryId = (value) => {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value === "") {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        throw new errors_1.AppError("categoryId must be a positive integer.", 400);
    }
    return parsed;
};
const slugify = (value) => {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    if (!slug) {
        throw new errors_1.AppError("Unable to generate a valid slug from product name.", 400);
    }
    return slug;
};
const normalizeName = (name) => {
    const normalized = name?.trim() || "";
    if (normalized.length < 2) {
        throw new errors_1.AppError("name must be at least 2 characters.", 400);
    }
    return normalized;
};
const normalizeListInput = (query) => {
    const page = toPositiveInt(query.page, 1);
    const limit = Math.min(toPositiveInt(query.limit, 12), 50);
    const search = query.search?.trim() || null;
    const category = query.category?.trim() || null;
    const minPrice = toNullableNumber(query.minPrice);
    const maxPrice = toNullableNumber(query.maxPrice);
    if (minPrice != null && minPrice < 0) {
        throw new errors_1.AppError("minPrice must be a positive number.", 400);
    }
    if (maxPrice != null && maxPrice < 0) {
        throw new errors_1.AppError("maxPrice must be a positive number.", 400);
    }
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
        throw new errors_1.AppError("minPrice cannot be greater than maxPrice.", 400);
    }
    const requestedSort = query.sort?.trim();
    const sort = requestedSort && ALLOWED_SORTS.includes(requestedSort) ? requestedSort : "newest";
    return {
        page,
        limit,
        search,
        category,
        minPrice,
        maxPrice,
        sort,
    };
};
const getProductList = async (query) => {
    const normalizedInput = normalizeListInput(query);
    const { items, total } = await (0, catalog_repository_1.listProductsFromRepository)(normalizedInput);
    const totalPages = total === 0 ? 0 : Math.ceil(total / normalizedInput.limit);
    return {
        items,
        pagination: {
            page: normalizedInput.page,
            limit: normalizedInput.limit,
            total,
            totalPages,
        },
    };
};
exports.getProductList = getProductList;
const getProductDetail = async (slugOrId) => {
    const identifier = slugOrId.trim();
    if (!identifier) {
        throw new errors_1.AppError("Product identifier is required.", 400);
    }
    const product = await (0, catalog_repository_1.getProductDetailFromRepository)(identifier);
    if (!product) {
        throw new errors_1.AppError("Product not found.", 404);
    }
    return product;
};
exports.getProductDetail = getProductDetail;
const createProduct = async (payload, uploadedImageUrl) => {
    const name = normalizeName(payload.name);
    const basePrice = toPrice(payload.basePrice, "basePrice");
    const categoryId = toOptionalCategoryId(payload.categoryId) ?? null;
    const slug = slugify(payload.slug?.trim() || name);
    const description = payload.description?.trim() || null;
    const imageUrl = uploadedImageUrl || payload.imageUrl?.trim() || null;
    const status = payload.status?.trim() || undefined;
    await (0, catalog_repository_1.assertProductSlugAvailable)(slug);
    const productId = await (0, catalog_repository_1.createProductInRepository)({
        name,
        slug,
        description,
        basePrice,
        categoryId,
        imageUrl,
        status,
    });
    const item = await (0, catalog_repository_1.getProductDetailFromRepository)(String(productId));
    return { id: productId, item };
};
exports.createProduct = createProduct;
const updateProduct = async (productIdParam, payload, uploadedImageUrl) => {
    const productId = toPositiveProductId(productIdParam);
    await (0, catalog_repository_1.assertProductExists)(productId);
    const updateInput = {};
    if (payload.name !== undefined) {
        updateInput.name = normalizeName(payload.name);
    }
    if (payload.slug !== undefined) {
        const nextSlug = slugify(payload.slug);
        await (0, catalog_repository_1.assertProductSlugAvailable)(nextSlug, productId);
        updateInput.slug = nextSlug;
    }
    if (payload.description !== undefined) {
        updateInput.description = payload.description?.trim() || null;
    }
    const basePrice = toOptionalPrice(payload.basePrice);
    if (basePrice !== undefined) {
        updateInput.basePrice = basePrice;
    }
    const categoryId = toOptionalCategoryId(payload.categoryId);
    if (categoryId !== undefined) {
        updateInput.categoryId = categoryId;
    }
    if (payload.imageUrl !== undefined) {
        updateInput.imageUrl = payload.imageUrl?.trim() || null;
    }
    if (uploadedImageUrl) {
        updateInput.imageUrl = uploadedImageUrl;
    }
    if (payload.isActive !== undefined) {
        const normalized = String(payload.isActive).trim().toLowerCase();
        updateInput.isActive = normalized === "true" || normalized === "1";
    }
    if (payload.status !== undefined) {
        updateInput.status = payload.status.trim();
    }
    if (Object.keys(updateInput).length === 0) {
        throw new errors_1.AppError("No updatable fields were provided.", 400);
    }
    await (0, catalog_repository_1.updateProductInRepository)(productId, updateInput);
    const item = await (0, catalog_repository_1.getProductDetailFromRepository)(String(productId));
    return { id: productId, item };
};
exports.updateProduct = updateProduct;
const deleteProduct = async (productIdParam) => {
    const productId = toPositiveProductId(productIdParam);
    await (0, catalog_repository_1.assertProductExists)(productId);
    await (0, catalog_repository_1.softDeleteProductInRepository)(productId);
};
exports.deleteProduct = deleteProduct;
