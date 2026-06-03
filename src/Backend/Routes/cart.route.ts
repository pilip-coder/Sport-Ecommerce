import { Router } from "express";

import {
  addItemToCart,
  checkout,
  emptyCart,
  getCartItems,
  removeItemFromCart,
  updateItemInCart,
} from "../Controllers/cart.controller";
import { requireAuth } from "../Core/guards";

const cartRouter = Router();

cartRouter.get("/", requireAuth, getCartItems);
cartRouter.post("/items", requireAuth, addItemToCart);
cartRouter.patch("/items/:itemId", requireAuth, updateItemInCart);
cartRouter.delete("/items/:itemId", requireAuth, removeItemFromCart);
cartRouter.delete("/", requireAuth, emptyCart);
cartRouter.post("/checkout", requireAuth, checkout);

export default cartRouter;
