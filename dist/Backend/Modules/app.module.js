"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModules = void 0;
const auth_module_1 = require("./auth.module");
const catalog_module_1 = require("./catalog.module");
<<<<<<< HEAD
=======
const category_module_1 = require("./category.module");
const order_module_1 = require("./order.module");
const review_module_1 = require("./review.module");
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
const user_module_1 = require("./user.module");
const registerModules = (app) => {
    (0, auth_module_1.registerAuthModule)(app);
    (0, user_module_1.registerUserModule)(app);
    (0, catalog_module_1.registerCatalogModule)(app);
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 691aaadec9880ae159688a8378a773650dc96168
=======
    (0, user_module_1.registerUserModule)(app);
>>>>>>> 7fcfc226682f4b9c92b267a431a325363e0e8150
=======
    (0, category_module_1.registerCategoryModule)(app);
    (0, review_module_1.registerReviewModule)(app);
    (0, order_module_1.registerOrderModule)(app);
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
};
exports.registerModules = registerModules;
