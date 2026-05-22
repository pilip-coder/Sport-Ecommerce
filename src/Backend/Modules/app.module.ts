import type { Express } from "express";

import { registerAuthModule } from "./auth.module";

export const registerModules = (app: Express): void => {
  registerAuthModule(app);
};
