import type { Express } from "express";

import { registerAuthModule } from "./auth.module";
import { registerCatalogModule } from "./catalog.module";
<<<<<<< HEAD
=======
import { registerCategoryModule } from "./category.module";
import { registerOrderModule } from "./order.module";
import { registerReviewModule } from "./review.module";
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
import { registerUserModule } from "./user.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerUserModule(app);
  registerCatalogModule(app);
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 691aaadec9880ae159688a8378a773650dc96168
=======
  registerUserModule(app);
>>>>>>> 7fcfc226682f4b9c92b267a431a325363e0e8150
=======
  registerCategoryModule(app);
  registerReviewModule(app);
  registerOrderModule(app);
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
};

