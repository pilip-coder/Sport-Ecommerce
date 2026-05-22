import { Express, Router } from "express";

import { createAuthModule } from "./auth.module";
import { createCatalogModule } from "./catalog.module";
import { createInventoryModule } from "./inventory.module";
import { createOrderModule } from "./order.module";
import { createPaymentModule } from "./payment.module";

interface FeatureModule {
  path: string;
  router: Router;
}

const featureModules: FeatureModule[] = [
  { path: "/api/auth", router: createAuthModule() },
  { path: "/api/catalog", router: createCatalogModule() },
  { path: "/api/inventory", router: createInventoryModule() },
  { path: "/api/orders", router: createOrderModule() },
  { path: "/api/payments", router: createPaymentModule() },
];

export const registerModules = (app: Express): void => {
  featureModules.forEach((featureModule) => {
    app.use(featureModule.path, featureModule.router);
  });
};
