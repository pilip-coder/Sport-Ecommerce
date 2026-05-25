import { Router } from "express";

import {
  createFavoriteProduct,
  createProductPurchase,
  deleteFavoriteProduct,
  getFavoriteProducts,
  getProduct,
  getProducts,
} from "../Controllers/catalog.controller";

const catalogRouter = Router();

catalogRouter.get("/products", getProducts);
catalogRouter.get("/products/:productId", getProduct);
catalogRouter.post("/products/:productId/buy", createProductPurchase);
catalogRouter.post("/products/:productId/favorites", createFavoriteProduct);
catalogRouter.delete("/products/:productId/favorites", deleteFavoriteProduct);
catalogRouter.get("/users/:userId/favorites", getFavoriteProducts);

export default catalogRouter;
