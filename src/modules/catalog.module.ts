import { Router } from "express";

import { CatalogController } from "../controllers/catalog.controller";
import { CatalogRepository } from "../repositories/catalog.repository";
import { createCatalogRouter } from "../routes/catalog.routes";
import { CatalogService } from "../services/catalog.service";

export const createCatalogModule = (): Router => {
  const catalogRepository = new CatalogRepository();
  const catalogService = new CatalogService(catalogRepository);
  const catalogController = new CatalogController(catalogService);

  return createCatalogRouter(catalogController);
};
