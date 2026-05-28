import { Router } from "express";

import {
  createCategoryByAdminOrStaff,
  deleteCategoryByAdminOrStaff,
  getCategoryBySlugOrId,
  listCategories,
  updateCategoryByAdminOrStaff,
} from "../Controllers/category.controller";
import { requireAuth, requireRoles } from "../Core/guards";

const categoryRouter = Router();

categoryRouter.get("/", listCategories);
categoryRouter.get("/:slugOrId", getCategoryBySlugOrId);

categoryRouter.post(
  "/",
  requireAuth,
  requireRoles("Admin", "Staff"),
  createCategoryByAdminOrStaff,
);
categoryRouter.put(
  "/:id",
  requireAuth,
  requireRoles("Admin", "Staff"),
  updateCategoryByAdminOrStaff,
);
categoryRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("Admin", "Staff"),
  deleteCategoryByAdminOrStaff,
);

export default categoryRouter;
