import type { Express } from "express";

import { registerAuthModule } from "./auth.module";
import { registerCartModule } from "./cart.module";
import { registerOrderModule } from "./order.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
  registerCartModule(app);
  registerOrderModule(app);
};
