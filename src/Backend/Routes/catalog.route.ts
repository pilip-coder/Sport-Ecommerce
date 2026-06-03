import { Router } from "express";

import {
  createProductByAdminOrStaff,
  deleteProductByAdminOrStaff,
  getProductByCategory,
  getProductBySlugOrId,
  listProducts,
  searchProducts,
  updateProductByAdminOrStaff,
} from "../Controllers/catalog.controller";

import { requireAuth, requireRoles } from "../Core/guards";
import { productImageUpload } from "../Core/middleware";

const catalogRouter = Router();

catalogRouter.get("/", listProducts);

// Public reads
catalogRouter.get("/search", searchProducts);
catalogRouter.get("/category/:categoryId", getProductByCategory);
catalogRouter.get("/:slugOrId", getProductBySlugOrId);


// Admin & Staff CRUD
catalogRouter.post(
  "/",
  requireAuth,
  requireRoles("Admin", "Staff"),
  productImageUpload.single("image"),
  createProductByAdminOrStaff,
);
catalogRouter.put(
  "/:id",
  requireAuth,
  requireRoles("Admin", "Staff"),
  productImageUpload.single("image"),
  updateProductByAdminOrStaff,
);
catalogRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("Admin", "Staff"),
  deleteProductByAdminOrStaff,
);


export default catalogRouter;
