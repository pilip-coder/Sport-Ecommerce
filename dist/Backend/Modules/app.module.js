"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModules = void 0;
<<<<<<< HEAD
const admin_module_1 = require("./admin.module");
const cart_module_1 = require("./cart.module");
=======
>>>>>>> 116a67043ace5b74e50389c26bac5db65f6b5495
const auth_module_1 = require("./auth.module");
const catalog_module_1 = require("./catalog.module");
const category_module_1 = require("./category.module");
const inventory_module_1 = require("./inventory.module");
const order_module_1 = require("./order.module");
const review_module_1 = require("./review.module");
const user_module_1 = require("./user.module");
const wishlist_module_1 = require("./wishlist.module");
const registerModules = (app) => {
    (0, auth_module_1.registerAuthModule)(app);
    (0, user_module_1.registerUserModule)(app);
<<<<<<< HEAD
    (0, cart_module_1.registerCartModule)(app);
    (0, wishlist_module_1.registerWishlistModule)(app);
    (0, admin_module_1.registerAdminModule)(app);
=======
>>>>>>> 116a67043ace5b74e50389c26bac5db65f6b5495
    (0, catalog_module_1.registerCatalogModule)(app);
    (0, category_module_1.registerCategoryModule)(app);
    (0, inventory_module_1.registerInventoryModule)(app);
    (0, review_module_1.registerReviewModule)(app);
    (0, order_module_1.registerOrderModule)(app);
};
exports.registerModules = registerModules;
