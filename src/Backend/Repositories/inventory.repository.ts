import { appDataSource } from "../Config/database.config";
import { environment } from "../Config/environment";
import { AppError } from "../Core/errors";
import type { InventoryItemDto } from "../dto/inventory";

interface StockSchema {
  tableName: string;
  stockIdColumn: string | null;
  variantIdColumn: string;
  quantityColumn: string;
  reservedQuantityColumn: string | null;
  warehouseLocationColumn: string | null;
  createdAtColumn: string | null;
  updatedAtColumn: string | null;
}

interface ProductAvailabilitySchema {
  productIdColumn: string;
  productStatusColumn: string | null;
  productActiveColumn: string | null;
  productUpdatedAtColumn: string | null;
}

interface StockSchemaRow {
  table_name: string;
  column_name: string;
  data_type: string;
  column_type: string;
}

interface ProductVariantRow {
  variant_id: number;
  product_id: number;
  sku: string;
}

interface InventoryRow {
  stock_id: number | null;
  product_variant_id: number;
  quantity: number;
  reserved_quantity: number | null;
  warehouse_location: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  product_id: number | null;
  sku: string | null;
}

const pickExistingColumn = (columns: Set<string>, candidates: string[]): string => {
  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return candidate;
    }
  }

  throw new AppError(`Unsupported stock schema. Expected one of: ${candidates.join(", ")}`, 500);
};

const pickOptionalColumn = (columns: Set<string>, candidates: string[]): string | null => {
  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return candidate;
    }
  }

  return null;
};

let inventoryTableReady = false;
let inventoryTableInitPromise: Promise<void> | null = null;
let stockSchemaPromise: Promise<StockSchema> | null = null;
let productAvailabilitySchemaPromise: Promise<ProductAvailabilitySchema | null> | null = null;

interface SqlExecutor {
  query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
}

const ensureInventoryTable = async (): Promise<void> => {
  if (inventoryTableReady || appDataSource.isInitialized) {
    inventoryTableReady = true;
    return;
  }

  if (!inventoryTableInitPromise) {
    inventoryTableInitPromise = (async () => {
      try {
        await appDataSource.initialize();
        inventoryTableReady = true;
      } catch (error) {
        const message = (error as { message?: string })?.message ?? String(error);
        throw new AppError(`Database unavailable: ${message}`, 503);
      }
    })().finally(() => {
      inventoryTableInitPromise = null;
    });
  }

  await inventoryTableInitPromise;
};

const ensureStockTable = async (): Promise<void> => {
  await ensureInventoryTable();

  const rows = (await appDataSource.query(
    `
      SELECT TABLE_NAME AS table_name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN ('stock', 'stocks')
    `,
    [environment.databaseName],
  )) as Array<{ table_name: string }>;

  if (rows.length > 0) {
    return;
  }

  await appDataSource.query(`
    CREATE TABLE IF NOT EXISTS stock (
      id int NOT NULL AUTO_INCREMENT,
      product_variant_id int NOT NULL,
      quantity int NOT NULL DEFAULT 0,
      reserved_quantity int NOT NULL DEFAULT 0,
      warehouse_location varchar(255) DEFAULT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_stock_product_variant_id (product_variant_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

const resolveStockSchema = async (): Promise<StockSchema> => {
  if (stockSchemaPromise) {
    return stockSchemaPromise;
  }

  stockSchemaPromise = (async () => {
    await ensureStockTable();

    const rows = (await appDataSource.query(
      `
        SELECT
          TABLE_NAME AS table_name,
          COLUMN_NAME AS column_name,
          DATA_TYPE AS data_type,
          COLUMN_TYPE AS column_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME IN ('stock', 'stocks')
      `,
      [environment.databaseName],
    )) as StockSchemaRow[];

    if (rows.length === 0) {
      throw new AppError("Stock table is unavailable.", 500);
    }

    const columnsByTable = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!columnsByTable.has(row.table_name)) {
        columnsByTable.set(row.table_name, new Set<string>());
      }
      columnsByTable.get(row.table_name)?.add(row.column_name);
    }

    const tableName = columnsByTable.has("stock") ? "stock" : "stocks";
    const columns = columnsByTable.get(tableName);
    if (!columns) {
      throw new AppError("Stock table is unavailable.", 500);
    }

    return {
      tableName,
      stockIdColumn: pickOptionalColumn(columns, ["stock_id", "id"]),
      variantIdColumn: pickExistingColumn(columns, ["variant_id", "product_variant_id"]),
      quantityColumn: pickExistingColumn(columns, ["quantity"]),
      reservedQuantityColumn: pickOptionalColumn(columns, ["reserved_quantity"]),
      warehouseLocationColumn: pickOptionalColumn(columns, ["warehouse_location"]),
      createdAtColumn: pickOptionalColumn(columns, ["created_at"]),
      updatedAtColumn: pickOptionalColumn(columns, ["updated_at"]),
    };
  })();

  try {
    return await stockSchemaPromise;
  } catch (error) {
    stockSchemaPromise = null;
    throw error;
  }
};

const resolveProductAvailabilitySchema = async (): Promise<ProductAvailabilitySchema | null> => {
  if (productAvailabilitySchemaPromise) {
    return productAvailabilitySchemaPromise;
  }

  productAvailabilitySchemaPromise = (async () => {
    await ensureInventoryTable();

    const rows = (await appDataSource.query(
      `
        SELECT
          TABLE_NAME AS table_name,
          COLUMN_NAME AS column_name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'products'
      `,
      [environment.databaseName],
    )) as Array<{ table_name: string; column_name: string }>;

    if (rows.length === 0) {
      return null;
    }

    const columns = new Set(rows.map((row) => row.column_name));
    return {
      productIdColumn: pickExistingColumn(columns, ["product_id", "id"]),
      productStatusColumn: pickOptionalColumn(columns, ["status"]),
      productActiveColumn: pickOptionalColumn(columns, ["is_active", "active"]),
      productUpdatedAtColumn: pickOptionalColumn(columns, ["updated_at"]),
    };
  })();

  try {
    return await productAvailabilitySchemaPromise;
  } catch (error) {
    productAvailabilitySchemaPromise = null;
    throw error;
  }
};

export const setProductAvailability = async (
  executor: SqlExecutor,
  productId: number,
  available: boolean,
): Promise<void> => {
  const schema = await resolveProductAvailabilitySchema();

  if (!schema) {
    return;
  }

  const setParts: string[] = [];
  const params: Array<string | number> = [];

  if (schema.productStatusColumn) {
    setParts.push(`${schema.productStatusColumn} = ?`);
    params.push(available ? "available" : "out_of_stock");
  }

  if (schema.productActiveColumn) {
    setParts.push(`${schema.productActiveColumn} = ?`);
    params.push(available ? 1 : 0);
  }

  if (setParts.length === 0) {
    return;
  }

  if (schema.productUpdatedAtColumn) {
    setParts.push(`${schema.productUpdatedAtColumn} = NOW()`);
  }

  params.push(productId);

  await executor.query(
    `
      UPDATE products
      SET ${setParts.join(", ")}
      WHERE ${schema.productIdColumn} = ?
    `,
    params,
  );
};

export const reserveVariantStock = async (
  executor: SqlExecutor,
  productId: number,
  productVariantId: number,
  quantity: number,
): Promise<{ remainingQuantity: number; sku: string | null }> => {
  const schema = await resolveStockSchema();
  const stockIdSql = schema.stockIdColumn ? `s.${schema.stockIdColumn}` : "NULL";

  const rows = (await executor.query(
    `
      SELECT
        ${stockIdSql} AS stock_id,
        s.${schema.variantIdColumn} AS product_variant_id,
        s.${schema.quantityColumn} AS quantity,
        pv.sku AS sku
      FROM ${schema.tableName} s
      INNER JOIN product_variants pv ON pv.variant_id = s.${schema.variantIdColumn}
      WHERE pv.product_id = ? AND s.${schema.variantIdColumn} = ?
      LIMIT 1 FOR UPDATE
    `,
    [productId, productVariantId],
  )) as Array<{ stock_id: number | null; product_variant_id: number; quantity: number; sku: string | null }>;

  const stockRow = rows[0];
  if (!stockRow) {
    throw new AppError(`Product ${productId} has already been ordered.`, 409);
  }

  const availableQuantity = Number(stockRow.quantity);
  if (availableQuantity < quantity) {
    throw new AppError(`Product ${productId} has already been ordered.`, 409);
  }

  const remainingQuantity = availableQuantity - quantity;
  await executor.query(
    `UPDATE ${schema.tableName} SET ${schema.quantityColumn} = ?${schema.updatedAtColumn ? `, ${schema.updatedAtColumn} = NOW()` : ""} WHERE ${schema.variantIdColumn} = ?`,
    [remainingQuantity, productVariantId],
  );

  await setProductAvailability(executor, productId, remainingQuantity > 0);

  return {
    remainingQuantity,
    sku: stockRow.sku,
  };
};

const getNextTableId = async (tableName: string, idColumn: string): Promise<number> => {
  const rows = (await appDataSource.query(
    `SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS next_id FROM ${tableName}`,
  )) as Array<{ next_id: number }>;

  return Number(rows[0]?.next_id ?? 1);
};

const loadVariantForProduct = async (productId: number): Promise<ProductVariantRow | null> => {
  const rows = (await appDataSource.query(
    "SELECT variant_id, product_id, sku FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC LIMIT 1",
    [productId],
  )) as ProductVariantRow[];

  return rows[0] ?? null;
};

const findStockRowForProduct = async (schema: StockSchema, productId: number): Promise<InventoryRow | null> => {
  const rows = (await appDataSource.query(
    `
      SELECT
        ${schema.stockIdColumn ? `s.${schema.stockIdColumn}` : "NULL"} AS stock_id,
        s.${schema.variantIdColumn} AS product_variant_id,
        s.${schema.quantityColumn} AS quantity,
        ${schema.reservedQuantityColumn ? `s.${schema.reservedQuantityColumn}` : "NULL"} AS reserved_quantity,
        ${schema.warehouseLocationColumn ? `s.${schema.warehouseLocationColumn}` : "NULL"} AS warehouse_location,
        ${schema.createdAtColumn ? `s.${schema.createdAtColumn}` : "NULL"} AS created_at,
        ${schema.updatedAtColumn ? `s.${schema.updatedAtColumn}` : "NULL"} AS updated_at,
        pv.product_id AS product_id,
        pv.sku AS sku
      FROM ${schema.tableName} s
      INNER JOIN product_variants pv ON pv.variant_id = s.${schema.variantIdColumn}
      WHERE pv.product_id = ?
      ORDER BY ${schema.stockIdColumn ? `s.${schema.stockIdColumn}` : `s.${schema.variantIdColumn}`} ASC
      LIMIT 1
    `,
    [productId],
  )) as InventoryRow[];

  return rows[0] ?? null;
};

const buildInventoryItem = (row: InventoryRow): InventoryItemDto | null => {
  if (row.product_id == null || row.sku == null) {
    return null;
  }

  return {
    productId: Number(row.product_id),
    sku: String(row.sku),
    quantity: Number(row.quantity),
  };
};

export const listInventoryRows = async (): Promise<InventoryItemDto[]> => {
  const schema = await resolveStockSchema();
  const stockIdSql = schema.stockIdColumn ? `s.${schema.stockIdColumn}` : "s.product_variant_id";
  const reservedQuantitySql = schema.reservedQuantityColumn ? `s.${schema.reservedQuantityColumn}` : "NULL";
  const warehouseLocationSql = schema.warehouseLocationColumn ? `s.${schema.warehouseLocationColumn}` : "NULL";
  const createdAtSql = schema.createdAtColumn ? `s.${schema.createdAtColumn}` : "NULL";
  const updatedAtSql = schema.updatedAtColumn ? `s.${schema.updatedAtColumn}` : "NULL";

  const rows = (await appDataSource.query(
    `
      SELECT
        ${schema.stockIdColumn ? `s.${schema.stockIdColumn}` : "NULL"} AS stock_id,
        s.${schema.variantIdColumn} AS product_variant_id,
        s.${schema.quantityColumn} AS quantity,
        ${reservedQuantitySql} AS reserved_quantity,
        ${warehouseLocationSql} AS warehouse_location,
        ${createdAtSql} AS created_at,
        ${updatedAtSql} AS updated_at,
        pv.product_id AS product_id,
        pv.sku AS sku
      FROM ${schema.tableName} s
      LEFT JOIN product_variants pv ON pv.variant_id = s.${schema.variantIdColumn}
      ORDER BY ${stockIdSql} ASC
    `,
  )) as InventoryRow[];

  return rows
    .map(buildInventoryItem)
    .filter((item): item is InventoryItemDto => item !== null);
};

export const updateInventoryStock = async (productId: number, quantity: number): Promise<InventoryItemDto | null> => {
  const schema = await resolveStockSchema();
  const variant = await loadVariantForProduct(productId);

  if (!variant) {
    return null;
  }

  const targetRow = await findStockRowForProduct(schema, productId);
  if (targetRow) {
    const updateFragments = [`${schema.quantityColumn} = ?`];
    const updateValues: Array<string | number> = [quantity];

    if (schema.updatedAtColumn) {
      updateFragments.push(`${schema.updatedAtColumn} = NOW()`);
    }

    if (schema.reservedQuantityColumn && targetRow.reserved_quantity != null) {
      updateFragments.push(`${schema.reservedQuantityColumn} = ?`);
      updateValues.push(Number(targetRow.reserved_quantity));
    }

    await appDataSource.query(
      `
        UPDATE ${schema.tableName}
        SET ${updateFragments.join(", ")}
        WHERE ${schema.variantIdColumn} = ?
        LIMIT 1
      `,
      [...updateValues, Number(variant.variant_id)],
    );

    return {
      productId: Number(variant.product_id),
      sku: variant.sku,
      quantity,
    };
  }

  const stockColumns = [schema.variantIdColumn, schema.quantityColumn];
  const stockPlaceholders = ["?", "?"];
  const stockValues: Array<string | number | null> = [variant.variant_id, quantity];

  if (schema.stockIdColumn) {
    stockColumns.unshift(schema.stockIdColumn);
    stockPlaceholders.unshift("?");
    stockValues.unshift(await getNextTableId(schema.tableName, schema.stockIdColumn));
  }

  if (schema.reservedQuantityColumn) {
    stockColumns.push(schema.reservedQuantityColumn);
    stockPlaceholders.push("?");
    stockValues.push(0);
  }

  if (schema.warehouseLocationColumn) {
    stockColumns.push(schema.warehouseLocationColumn);
    stockPlaceholders.push("?");
    stockValues.push(null);
  }

  if (schema.createdAtColumn) {
    stockColumns.push(schema.createdAtColumn);
    stockPlaceholders.push("NOW()");
  }

  if (schema.updatedAtColumn) {
    stockColumns.push(schema.updatedAtColumn);
    stockPlaceholders.push("NOW()");
  }

  await appDataSource.query(
    `
      INSERT INTO ${schema.tableName} (
        ${stockColumns.join(", ")}
      ) VALUES (${stockPlaceholders.join(", ")})
    `,
    stockValues,
  );

  return {
    productId: Number(variant.product_id),
    sku: variant.sku,
    quantity,
  };
};

export const createInventoryStock = async (productId: number, quantity: number): Promise<InventoryItemDto | null> => {
  const schema = await resolveStockSchema();
  const variant = await loadVariantForProduct(productId);

  if (!variant) {
    return null;
  }

  const existingRow = await findStockRowForProduct(schema, productId);
  if (existingRow) {
    throw new AppError("Stock already exists for this product.", 409);
  }

  const stockColumns = [schema.variantIdColumn, schema.quantityColumn];
  const stockPlaceholders = ["?", "?"];
  const stockValues: Array<string | number | null> = [variant.variant_id, quantity];

  if (schema.stockIdColumn) {
    stockColumns.unshift(schema.stockIdColumn);
    stockPlaceholders.unshift("?");
    stockValues.unshift(await getNextTableId(schema.tableName, schema.stockIdColumn));
  }

  if (schema.reservedQuantityColumn) {
    stockColumns.push(schema.reservedQuantityColumn);
    stockPlaceholders.push("?");
    stockValues.push(0);
  }

  if (schema.warehouseLocationColumn) {
    stockColumns.push(schema.warehouseLocationColumn);
    stockPlaceholders.push("?");
    stockValues.push(null);
  }

  if (schema.createdAtColumn) {
    stockColumns.push(schema.createdAtColumn);
    stockPlaceholders.push("NOW()");
  }

  if (schema.updatedAtColumn) {
    stockColumns.push(schema.updatedAtColumn);
    stockPlaceholders.push("NOW()");
  }

  await appDataSource.query(
    `
      INSERT INTO ${schema.tableName} (
        ${stockColumns.join(", ")}
      ) VALUES (${stockPlaceholders.join(", ")})
    `,
    stockValues,
  );

  return {
    productId: Number(variant.product_id),
    sku: variant.sku,
    quantity,
  };
};
