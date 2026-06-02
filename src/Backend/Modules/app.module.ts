import type { Express } from "express";

<<<<<<< HEAD
import { registerAdminModule } from "./admin.module";
import { registerCartModule } from "./cart.module";
=======
>>>>>>> 116a67043ace5b74e50389c26bac5db65f6b5495
import { registerAuthModule } from "./auth.module";
import { registerCatalogModule } from "./catalog.module";
import { registerCategoryModule } from "./category.module";
import { registerInventoryModule } from "./inventory.module";
import { registerOrderModule } from "./order.module";
import { registerReviewModule } from "./review.module";
import { registerUserModule } from "./user.module";
import { registerWishlistModule } from "./wishlist.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerUserModule(app);
<<<<<<< HEAD
  registerCartModule(app);
  registerWishlistModule(app);
  registerAdminModule(app);
=======
>>>>>>> 116a67043ace5b74e50389c26bac5db65f6b5495
  registerCatalogModule(app);
  registerCategoryModule(app);
  registerInventoryModule(app);
  registerReviewModule(app);
  registerOrderModule(app);
};
