import { Router } from "express";

import {
  addCartItem,
  clearUserCart,
  deleteCartItemById,
  getCart,
  updateCartItem,
} from "../Controllers/cart.controller";
import { requireAuth } from "../Core/guards";

const cartRouter = Router();

cartRouter.get("/", requireAuth, getCart);
cartRouter.post("/items", requireAuth, addCartItem);
cartRouter.patch("/items/:id", requireAuth, updateCartItem);
cartRouter.delete("/items/:id", requireAuth, deleteCartItemById);
cartRouter.delete("/", requireAuth, clearUserCart);

export default cartRouter;
