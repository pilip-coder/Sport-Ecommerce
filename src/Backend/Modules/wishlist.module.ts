import type { Express } from "express";

import wishlistRouter from "../Routes/wishlist.route";

export const registerWishlistModule = (app: Express): void => {
  app.use("/api/wishlist", wishlistRouter);
};
