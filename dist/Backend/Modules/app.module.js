"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModules = void 0;
const auth_module_1 = require("./auth.module");
const cart_module_1 = require("./cart.module");
const order_module_1 = require("./order.module");
const registerModules = (app) => {
    (0, auth_module_1.registerAuthModule)(app);
    (0, cart_module_1.registerCartModule)(app);
    (0, order_module_1.registerOrderModule)(app);
};
exports.registerModules = registerModules;
