import type { Express } from "express";

import { registerAuthModule } from "./auth.module";
<<<<<<< HEAD
import { registerCartModule } from "./cart.module";
import { registerOrderModule } from "./order.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerCartModule(app);
  registerOrderModule(app);
=======
import { registerCategoryModule } from "./category.module";
import { registerCatalogModule } from "./catalog.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerCategoryModule(app);
  registerCatalogModule(app);
>>>>>>> 691aaadec9880ae159688a8378a773650dc96168
};
