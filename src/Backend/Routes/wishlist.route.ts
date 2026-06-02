import { Router } from "express";

import {
  addItemToWishlist,
  listWishlist,
  removeItemFromWishlist,
} from "../Controllers/wishlist.controller";
import { requireAuth } from "../Core/guards";

const wishlistRouter = Router();

wishlistRouter.get("/", requireAuth, listWishlist);
wishlistRouter.post("/:productId", requireAuth, addItemToWishlist);
wishlistRouter.delete("/:productId", requireAuth, removeItemFromWishlist);

export default wishlistRouter;
