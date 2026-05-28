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
import { registerUserModule } from "./user.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerCategoryModule(app);
  registerCatalogModule(app);
<<<<<<< HEAD
>>>>>>> 691aaadec9880ae159688a8378a773650dc96168
=======
  registerUserModule(app);
>>>>>>> 7fcfc226682f4b9c92b267a431a325363e0e8150
};

