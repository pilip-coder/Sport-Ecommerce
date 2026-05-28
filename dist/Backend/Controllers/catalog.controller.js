"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductByCategory = exports.searchProducts = exports.deleteProductByAdminOrStaff = exports.updateProductByAdminOrStaff = exports.createProductByAdminOrStaff = exports.getProductBySlugOrId = exports.listProducts = void 0;
const utils_1 = require("../Core/utils");
const catalog_service_1 = require("../Services/catalog.service");
exports.listProducts = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, catalog_service_1.getProductList)(req.query);
    res.status(200).json(result);
});
exports.getProductBySlugOrId = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, catalog_service_1.getProductDetail)(req.params.slugOrId);
    res.status(200).json({ item: result });
});
exports.createProductByAdminOrStaff = (0, utils_1.asyncHandler)(async (req, res) => {
    const uploadedImageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
    const result = await (0, catalog_service_1.createProduct)(req.body, uploadedImageUrl);
    res.status(201).json({
        message: "Product created successfully.",
        ...result,
    });
});
exports.updateProductByAdminOrStaff = (0, utils_1.asyncHandler)(async (req, res) => {
    const uploadedImageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;
    const result = await (0, catalog_service_1.updateProduct)(String(req.params.id ?? ""), req.body, uploadedImageUrl);
    res.status(200).json({
        message: "Product updated successfully.",
        ...result,
    });
});
exports.deleteProductByAdminOrStaff = (0, utils_1.asyncHandler)(async (req, res) => {
    await (0, catalog_service_1.deleteProduct)(String(req.params.id ?? ""));
    res.status(200).json({
        message: "Product deleted successfully.",
    });
});
exports.searchProducts = (0, utils_1.asyncHandler)(async (req, res) => {
    const q = (req.query.q ?? "").toString();
    const result = await (0, catalog_service_1.getProductList)({
        page: (req.query.page ?? "1").toString(),
        limit: (req.query.limit ?? "12").toString(),
        search: q || undefined,
        category: req.query.category?.toString() ?? undefined,
        minPrice: req.query.minPrice?.toString() ?? undefined,
        maxPrice: req.query.maxPrice?.toString() ?? undefined,
        sort: req.query.sort?.toString() ?? undefined,
    });
    res.status(200).json(result);
});
exports.getProductByCategory = (0, utils_1.asyncHandler)(async (req, res) => {
    const categoryId = String(req.params.categoryId ?? "");
    const result = await (0, catalog_service_1.getProductList)({
        page: (req.query.page ?? "1").toString(),
        limit: (req.query.limit ?? "12").toString(),
        search: req.query.q?.toString() ?? undefined,
        category: categoryId,
        minPrice: req.query.minPrice?.toString() ?? undefined,
        maxPrice: req.query.maxPrice?.toString() ?? undefined,
        sort: req.query.sort?.toString() ?? undefined,
    });
    res.status(200).json(result);
});
