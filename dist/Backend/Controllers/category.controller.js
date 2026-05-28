"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategoryByAdminOrStaff = exports.updateCategoryByAdminOrStaff = exports.createCategoryByAdminOrStaff = exports.getCategoryBySlugOrId = exports.listCategories = void 0;
const utils_1 = require("../Core/utils");
const category_service_1 = require("../Services/category.service");
exports.listCategories = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, category_service_1.getCategoryList)(req.query);
    res.status(200).json({ items: result });
});
exports.getCategoryBySlugOrId = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, category_service_1.getCategoryDetail)(req.params.slugOrId);
    res.status(200).json({ item: result });
});
exports.createCategoryByAdminOrStaff = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, category_service_1.createCategory)(req.body);
    res.status(201).json({
        message: "Category created successfully.",
        ...result,
    });
});
exports.updateCategoryByAdminOrStaff = (0, utils_1.asyncHandler)(async (req, res) => {
    const result = await (0, category_service_1.updateCategory)(String(req.params.id ?? ""), req.body);
    res.status(200).json({
        message: "Category updated successfully.",
        ...result,
    });
});
exports.deleteCategoryByAdminOrStaff = (0, utils_1.asyncHandler)(async (req, res) => {
    await (0, category_service_1.deleteCategory)(String(req.params.id ?? ""));
    res.status(200).json({
        message: "Category deleted successfully.",
    });
});
