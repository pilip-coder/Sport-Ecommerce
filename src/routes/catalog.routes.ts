import { Router } from "express";

import { CatalogController } from "../controllers/catalog.controller";
import { asyncHandler } from "../core/utils";

export const createCatalogRouter = (catalogController: CatalogController): Router => {
  const router = Router();

  router.get("/", asyncHandler(catalogController.list));
  router.get("/:id", asyncHandler(catalogController.getById));
  router.post("/", asyncHandler(catalogController.create));
  router.patch("/:id", asyncHandler(catalogController.update));

  return router;
};
