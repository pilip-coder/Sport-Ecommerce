import type { Express } from "express";

import { registerAuthModule } from "./auth.module";
import { registerCatalogModule } from "./catalog.module";
import { registerCategoryModule } from "./category.module";
import { registerInventoryModule } from "./inventory.module";
import { registerOrderModule } from "./order.module";
import { registerReviewModule } from "./review.module";
import { registerUserModule } from "./user.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerUserModule(app);
  registerCatalogModule(app);
  registerCategoryModule(app);
  registerInventoryModule(app);
  registerReviewModule(app);
  registerOrderModule(app);
};
