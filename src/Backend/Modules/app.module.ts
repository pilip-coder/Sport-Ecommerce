import type { Express } from "express";

import { registerAdminModule } from "./admin.module";
import { registerCartModule } from "./cart.module";
import { registerAuthModule } from "./auth.module";
import { registerCatalogModule } from "./catalog.module";
import { registerCategoryModule } from "./category.module";
import { registerOrderModule } from "./order.module";
import { registerReviewModule } from "./review.module";
import { registerUserModule } from "./user.module";
import { registerWishlistModule } from "./wishlist.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerUserModule(app);
  registerCartModule(app);
  registerWishlistModule(app);
  registerAdminModule(app);
  registerCatalogModule(app);
  registerCategoryModule(app);
  registerReviewModule(app);
  registerOrderModule(app);
};

