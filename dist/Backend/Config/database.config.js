"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.connectDatabase = exports.appDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const environment_1 = require("./environment");
const user_model_1 = require("../Models/user.model");
exports.appDataSource = new typeorm_1.DataSource({
    type: "mysql",
    host: environment_1.environment.databaseHost,
    port: environment_1.environment.databasePort,
    username: environment_1.environment.databaseUser,
    password: environment_1.environment.databasePassword,
    database: environment_1.environment.databaseName,
    synchronize: environment_1.environment.databaseSynchronize,
    logging: false,
    entities: [user_model_1.UserEntity],
    extra: {
        connectionLimit: environment_1.environment.databaseConnectionLimit,
    },
});
const connectDatabase = async () => {
    try {
        if (!exports.appDataSource.isInitialized) {
            await exports.appDataSource.initialize();
        }
        console.log(`MySQL connected via TypeORM: ${environment_1.environment.databaseHost}:${environment_1.environment.databasePort}/${environment_1.environment.databaseName}`);
    }
    catch (error) {
        console.error("Unable to establish MySQL TypeORM connection.", error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const closeDatabase = async () => {
    if (exports.appDataSource.isInitialized) {
        await exports.appDataSource.destroy();
    }
};
exports.closeDatabase = closeDatabase;
