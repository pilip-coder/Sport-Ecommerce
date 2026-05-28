"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModules = void 0;
const auth_module_1 = require("./auth.module");
const category_module_1 = require("./category.module");
const catalog_module_1 = require("./catalog.module");
const registerModules = (app) => {
    (0, auth_module_1.registerAuthModule)(app);
    (0, category_module_1.registerCategoryModule)(app);
    (0, catalog_module_1.registerCatalogModule)(app);
};
exports.registerModules = registerModules;
