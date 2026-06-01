import type { Express } from "express";

import { registerAdminModule } from "./admin.module";
import { registerAuthModule } from "./auth.module";
import { registerCatalogModule } from "./catalog.module";
import { registerCategoryModule } from "./category.module";
import { registerOrderModule } from "./order.module";
import { registerReviewModule } from "./review.module";
import { registerUserModule } from "./user.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerUserModule(app);
  registerAdminModule(app);
  registerCatalogModule(app);
  registerCategoryModule(app);
  registerReviewModule(app);
  registerOrderModule(app);
};

