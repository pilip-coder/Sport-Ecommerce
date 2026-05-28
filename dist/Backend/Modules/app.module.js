"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModules = void 0;
const auth_module_1 = require("./auth.module");
<<<<<<< HEAD
const cart_module_1 = require("./cart.module");
const order_module_1 = require("./order.module");
const registerModules = (app) => {
    (0, auth_module_1.registerAuthModule)(app);
    (0, cart_module_1.registerCartModule)(app);
    (0, order_module_1.registerOrderModule)(app);
=======
const category_module_1 = require("./category.module");
const catalog_module_1 = require("./catalog.module");
const registerModules = (app) => {
    (0, auth_module_1.registerAuthModule)(app);
    (0, category_module_1.registerCategoryModule)(app);
    (0, catalog_module_1.registerCatalogModule)(app);
>>>>>>> 691aaadec9880ae159688a8378a773650dc96168
};
exports.registerModules = registerModules;
