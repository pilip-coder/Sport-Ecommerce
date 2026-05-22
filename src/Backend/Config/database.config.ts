import "reflect-metadata";

import { DataSource } from "typeorm";
import { environment } from "./environment";
import { UserEntity } from "../Models/user.model";

export const appDataSource = new DataSource({
  type: "mysql",
  host: environment.databaseHost,
  port: environment.databasePort,
  username: environment.databaseUser,
  password: environment.databasePassword,
  database: environment.databaseName,
  synchronize: environment.databaseSynchronize,
  logging: false,
  entities: [UserEntity],
  extra: {
    connectionLimit: environment.databaseConnectionLimit,
  },
});

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!appDataSource.isInitialized) {
      await appDataSource.initialize();
    }
    console.log(
      `MySQL connected via TypeORM: ${environment.databaseHost}:${environment.databasePort}/${environment.databaseName}`,
    );
  } catch (error) {
    console.error("Unable to establish MySQL TypeORM connection.", error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (appDataSource.isInitialized) {
    await appDataSource.destroy();
  }
};
