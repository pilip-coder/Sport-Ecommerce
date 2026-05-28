"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catalog_controller_1 = require("../Controllers/catalog.controller");
const guards_1 = require("../Core/guards");
const middleware_1 = require("../Core/middleware");
const catalogRouter = (0, express_1.Router)();
catalogRouter.get("/", catalog_controller_1.listProducts);
// Public reads
catalogRouter.get("/search", catalog_controller_1.searchProducts);
catalogRouter.get("/category/:categoryId", catalog_controller_1.getProductByCategory);
catalogRouter.get("/:slugOrId", catalog_controller_1.getProductBySlugOrId);
// Admin & Staff CRUD
catalogRouter.post("/", guards_1.requireAuth, (0, guards_1.requireRoles)("Admin", "Staff"), middleware_1.productImageUpload.single("image"), catalog_controller_1.createProductByAdminOrStaff);
catalogRouter.put("/:id", guards_1.requireAuth, (0, guards_1.requireRoles)("Admin", "Staff"), middleware_1.productImageUpload.single("image"), catalog_controller_1.updateProductByAdminOrStaff);
catalogRouter.delete("/:id", guards_1.requireAuth, (0, guards_1.requireRoles)("Admin", "Staff"), catalog_controller_1.deleteProductByAdminOrStaff);
exports.default = catalogRouter;
