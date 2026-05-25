import { Router } from "express";

import {
  createAdminProduct,
  createFavoriteProduct,
  createProductPurchase,
  deleteAdminProduct,
  getAdminProduct,
  getAdminProducts,
  deleteFavoriteProduct,
  getFavoriteProducts,
  getProduct,
  getProducts,
  updateAdminProduct,
} from "../Controllers/catalog.controller";

const catalogRouter = Router();

catalogRouter.get("/admin/products", getAdminProducts);
catalogRouter.post("/admin/products", createAdminProduct);
catalogRouter.get("/admin/products/:productId", getAdminProduct);
catalogRouter.put("/admin/products/:productId", updateAdminProduct);
catalogRouter.patch("/admin/products/:productId", updateAdminProduct);
catalogRouter.delete("/admin/products/:productId", deleteAdminProduct);
catalogRouter.post("/admin/products/:productId/buy", createProductPurchase);
catalogRouter.post("/admin/products/:productId/favorites", createFavoriteProduct);
catalogRouter.delete("/admin/products/:productId/favorites", deleteFavoriteProduct);
catalogRouter.get("/admin/users/:userId/favorites", getFavoriteProducts);

catalogRouter.get("/products", getProducts);
catalogRouter.get("/products/:productId", getProduct);
catalogRouter.post("/products/:productId/buy", createProductPurchase);
catalogRouter.post("/products/:productId/favorites", createFavoriteProduct);
catalogRouter.delete("/products/:productId/favorites", deleteFavoriteProduct);
catalogRouter.get("/users/:userId/favorites", getFavoriteProducts);

export default catalogRouter;
