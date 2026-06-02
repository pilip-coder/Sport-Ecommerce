import { appDataSource } from "../Config/database.config";
import { cartTableSql, wishlistTableSql } from "../Config/commerce-tables";
import { AppError } from "../Core/errors";

let commerceTablesReady = false;
let commerceTablesInitPromise: Promise<void> | null = null;

export const ensureCommerceTables = async (): Promise<void> => {
  if (commerceTablesReady) {
    return;
  }

  if (!commerceTablesInitPromise) {
    commerceTablesInitPromise = (async () => {
      try {
        if (!appDataSource.isInitialized) {
          await appDataSource.initialize();
        }

        await appDataSource.query(cartTableSql);
        await appDataSource.query(wishlistTableSql);
        commerceTablesReady = true;
      } catch (error) {
        const message = (error as { message?: string })?.message ?? String(error);
        throw new AppError(`Unable to prepare commerce tables: ${message}`, 503);
      }
    })().finally(() => {
      commerceTablesInitPromise = null;
    });
  }

  await commerceTablesInitPromise;
};
