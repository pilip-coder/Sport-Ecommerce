import type { RowDataPacket } from "mysql2/promise";

import { appDataSource } from "../Config/database.config";
import { environment } from "../Config/environment";
import { AppError } from "../Core/errors";
import type { CategoryDetailDto, CategoryProductPreviewDto, CategorySummaryDto } from "../dto/category";

let categoryDbReady = false;
let categoryDbInitPromise: Promise<void> | null = null;
let categorySchemaPromise: Promise<CategorySchema> | null = null;

interface CategorySchema {
  categoryIdColumn: string;
  categoryNameColumn: string;
  categorySlugColumn: string | null;
  categoryDescriptionColumn: string | null;
  categoryParentIdColumn: string | null;
  categoryStatusColumn: string | null;
  categoryStatusEnumValues: string[] | null;
  categoryActiveColumn: string | null;
  categoryUpdatedAtColumn: string | null;
  categoryActiveIsText: boolean;
  productIdColumn: string;
  productCategoryIdColumn: string;
  productNameColumn: string;
  productSlugColumn: string | null;
  productBasePriceColumn: string;
  productImageUrlColumn: string | null;
  productStatusColumn: string | null;
  productActiveColumn: string | null;
  productActiveIsText: boolean;
}

interface InformationSchemaColumnRow extends RowDataPacket {
  table_name: string;
  column_name: string;
  data_type: string;
  column_type: string;
}

interface CategoryListRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  parent_id: number | null;
  is_active: number | boolean | string | null;
  product_count: number | string | null;
}

interface CategoryProductRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string | null;
  base_price: number | string;
  image_url: string | null;
  status: string | null;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface CategoryAdminRow extends RowDataPacket {
  id: number;
}

export interface CreateCategoryRepositoryInput {
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  status?: string;
  isActive?: boolean;
}

export interface UpdateCategoryRepositoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: number | null;
  status?: string;
  isActive?: boolean;
}

const quoteIdentifier = (identifier: string): string => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new AppError(`Invalid SQL identifier: ${identifier}`, 500);
  }
  return `\`${identifier}\``;
};

const pickExistingColumn = (
  tableColumns: Map<string, Set<string>>,
  tableName: string,
  candidates: string[],
): string => {
  const columns = tableColumns.get(tableName);
  if (!columns) {
    throw new AppError(`Missing required database table: ${tableName}`, 500);
  }

  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return candidate;
    }
  }

  throw new AppError(
    `Unsupported schema on table ${tableName}. Expected one of: ${candidates.join(", ")}`,
    500,
  );
};

const pickOptionalColumn = (
  tableColumns: Map<string, Set<string>>,
  tableName: string,
  candidates: string[],
): string | null => {
  const columns = tableColumns.get(tableName);
  if (!columns) {
    return null;
  }

  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return candidate;
    }
  }

  return null;
};

const isTextColumnType = (value: string | undefined): boolean => {
  const type = (value ?? "").toLowerCase();
  return type === "char"
    || type === "varchar"
    || type === "text"
    || type === "tinytext"
    || type === "mediumtext"
    || type === "longtext"
    || type === "enum"
    || type === "set";
};

const getColumnType = (
  columnTypesByTable: Map<string, Map<string, string>>,
  tableName: string,
  columnName: string | null,
): string | null => {
  if (!columnName) {
    return null;
  }
  const table = columnTypesByTable.get(tableName);
  if (!table) {
    return null;
  }
  return table.get(columnName) ?? null;
};

const getColumnDefinition = (
  columnDefinitionsByTable: Map<string, Map<string, string>>,
  tableName: string,
  columnName: string | null,
): string | null => {
  if (!columnName) {
    return null;
  }
  const table = columnDefinitionsByTable.get(tableName);
  if (!table) {
    return null;
  }
  return table.get(columnName) ?? null;
};

const parseEnumValues = (columnDefinition: string | null): string[] | null => {
  if (!columnDefinition) {
    return null;
  }

  const match = columnDefinition.match(/^enum\((.*)\)$/i);
  if (!match) {
    return null;
  }

  const inside = match[1] ?? "";
  const values = inside
    .split(",")
    .map((part) => part.trim().replace(/^'(.*)'$/, "$1"))
    .filter(Boolean);

  return values.length > 0 ? values : null;
};

const pickStatusByActive = (
  statusEnumValues: string[] | null,
  isActive: boolean,
): string | null => {
  if (!statusEnumValues || statusEnumValues.length === 0) {
    return null;
  }

  const normalized = statusEnumValues.map((v) => v.toLowerCase());
  const activeCandidates = ["active", "available", "enabled", "published", "approved", "in_stock"];
  const inactiveCandidates = ["inactive", "out_of_stock", "disabled", "draft", "archived", "rejected"];
  const candidates = isActive ? activeCandidates : inactiveCandidates;

  for (const candidate of candidates) {
    const index = normalized.indexOf(candidate);
    if (index >= 0) {
      return statusEnumValues[index];
    }
  }

  return isActive ? statusEnumValues[0] : statusEnumValues[statusEnumValues.length - 1];
};

const toNumber = (value: number | string | null, fallback = 0): number => {
  if (value == null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: number | boolean | string | null | undefined, fallback: boolean): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "active", "available", "enabled"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "inactive", "disabled", "archived"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const slugify = (value: string): string => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return slug || "category";
};

const buildEnabledFilterSql = (
  tableAlias: string,
  columnName: string | null,
  isText: boolean,
): string => {
  if (!columnName) {
    return "1 = 1";
  }

  const qColumn = quoteIdentifier(columnName);
  const scopedColumn = tableAlias ? `${tableAlias}.${qColumn}` : qColumn;
  if (isText) {
    return `LOWER(COALESCE(${scopedColumn}, '')) IN ('active', 'approved', '1', 'true', 'yes', 'available', 'enabled')`;
  }

  return `${scopedColumn} = 1`;
};

const getActiveWriteValue = (enabled: boolean, isText: boolean): string | number => {
  if (isText) {
    return enabled ? "active" : "inactive";
  }
  return enabled ? 1 : 0;
};

const mapCategorySummary = (row: CategoryListRow): CategorySummaryDto => {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || slugify(row.name),
    description: row.description,
    parentId: row.parent_id,
    isActive: toBoolean(row.is_active, true),
    productCount: toNumber(row.product_count),
  };
};

const mapCategoryProduct = (row: CategoryProductRow): CategoryProductPreviewDto => {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || slugify(row.name),
    basePrice: toNumber(row.base_price),
    imageUrl: row.image_url,
    status: row.status,
  };
};

const resolveCategorySchema = async (): Promise<CategorySchema> => {
  if (categorySchemaPromise) {
    return categorySchemaPromise;
  }

  categorySchemaPromise = (async () => {
    const rows = (await appDataSource.query(
      `
        SELECT
          TABLE_NAME AS table_name,
          COLUMN_NAME AS column_name,
          DATA_TYPE AS data_type,
          COLUMN_TYPE AS column_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME IN ('categories', 'products')
      `,
      [environment.databaseName],
    )) as InformationSchemaColumnRow[];

    const columnsByTable = new Map<string, Set<string>>();
    const columnTypesByTable = new Map<string, Map<string, string>>();
    const columnDefinitionsByTable = new Map<string, Map<string, string>>();

    for (const row of rows) {
      if (!columnsByTable.has(row.table_name)) {
        columnsByTable.set(row.table_name, new Set<string>());
      }
      columnsByTable.get(row.table_name)?.add(row.column_name);

      if (!columnTypesByTable.has(row.table_name)) {
        columnTypesByTable.set(row.table_name, new Map<string, string>());
      }
      columnTypesByTable.get(row.table_name)?.set(row.column_name, row.data_type);

      if (!columnDefinitionsByTable.has(row.table_name)) {
        columnDefinitionsByTable.set(row.table_name, new Map<string, string>());
      }
      columnDefinitionsByTable.get(row.table_name)?.set(row.column_name, row.column_type);
    }

    const categoryStatusColumn = pickOptionalColumn(columnsByTable, "categories", ["status"]);
    const categoryActiveColumn = pickOptionalColumn(columnsByTable, "categories", ["is_active", "active"]);
    const productActiveColumn = pickOptionalColumn(columnsByTable, "products", ["is_active", "active"]);

    return {
      categoryIdColumn: pickExistingColumn(columnsByTable, "categories", ["id", "category_id"]),
      categoryNameColumn: pickExistingColumn(columnsByTable, "categories", ["name", "category_name"]),
      categorySlugColumn: pickOptionalColumn(columnsByTable, "categories", ["slug"]),
      categoryDescriptionColumn: pickOptionalColumn(columnsByTable, "categories", ["description"]),
      categoryParentIdColumn: pickOptionalColumn(columnsByTable, "categories", ["parent_id", "parentId"]),
      categoryStatusColumn,
      categoryStatusEnumValues: parseEnumValues(
        getColumnDefinition(columnDefinitionsByTable, "categories", categoryStatusColumn),
      ),
      categoryActiveColumn,
      categoryUpdatedAtColumn: pickOptionalColumn(columnsByTable, "categories", ["updated_at"]),
      categoryActiveIsText: isTextColumnType(getColumnType(columnTypesByTable, "categories", categoryActiveColumn) ?? undefined),
      productIdColumn: pickExistingColumn(columnsByTable, "products", ["id", "product_id"]),
      productCategoryIdColumn: pickExistingColumn(columnsByTable, "products", ["category_id", "categoryId"]),
      productNameColumn: pickExistingColumn(columnsByTable, "products", ["name", "product_name"]),
      productSlugColumn: pickOptionalColumn(columnsByTable, "products", ["slug"]),
      productBasePriceColumn: pickExistingColumn(columnsByTable, "products", ["base_price", "price"]),
      productImageUrlColumn: pickOptionalColumn(columnsByTable, "products", ["image_url"]),
      productStatusColumn: pickOptionalColumn(columnsByTable, "products", ["status"]),
      productActiveColumn,
      productActiveIsText: isTextColumnType(getColumnType(columnTypesByTable, "products", productActiveColumn) ?? undefined),
    };
  })();

  try {
    return await categorySchemaPromise;
  } catch (error) {
    categorySchemaPromise = null;
    throw error;
  }
};

const ensureCategoryDatabase = async (): Promise<void> => {
  if (categoryDbReady || appDataSource.isInitialized) {
    categoryDbReady = true;
    return;
  }

  if (!categoryDbInitPromise) {
    categoryDbInitPromise = (async () => {
      try {
        await appDataSource.initialize();
        categoryDbReady = true;
      } catch (error) {
        const message = (error as { message?: string })?.message ?? String(error);
        throw new AppError(`Database unavailable: ${message}`, 503);
      }
    })().finally(() => {
      categoryDbInitPromise = null;
    });
  }

  await categoryDbInitPromise;
};

const getNextCategoryId = async (categoryIdSql: string): Promise<number> => {
  const rows = (await appDataSource.query(
    `SELECT COALESCE(MAX(${categoryIdSql}), 0) + 1 AS next_id FROM categories`,
  )) as Array<RowDataPacket & { next_id: number | string }>;

  return toNumber(rows[0]?.next_id, 1);
};

const findCategoryById = async (categoryId: number): Promise<CategoryAdminRow | null> => {
  const schema = await resolveCategorySchema();
  const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);

  const rows = (await appDataSource.query(
    `
      SELECT ${categoryIdSql} AS id
      FROM categories
      WHERE ${categoryIdSql} = ?
      LIMIT 1
    `,
    [categoryId],
  )) as CategoryAdminRow[];

  return rows[0] ?? null;
};

const isCategorySlugTaken = async (slug: string, excludeCategoryId?: number): Promise<boolean> => {
  const schema = await resolveCategorySchema();
  if (!schema.categorySlugColumn) {
    return false;
  }

  const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
  const categorySlugSql = quoteIdentifier(schema.categorySlugColumn);

  const whereParts = [`LOWER(${categorySlugSql}) = ?`];
  const params: Array<string | number> = [slug.trim().toLowerCase()];

  if (excludeCategoryId) {
    whereParts.push(`${categoryIdSql} <> ?`);
    params.push(excludeCategoryId);
  }

  const rows = (await appDataSource.query(
    `
      SELECT ${categoryIdSql} AS id
      FROM categories
      WHERE ${whereParts.join(" AND ")}
      LIMIT 1
    `,
    params,
  )) as Array<RowDataPacket & { id: number }>;

  return rows.length > 0;
};

export const listCategoriesFromRepository = async (
  search: string | null,
): Promise<CategorySummaryDto[]> => {
  await ensureCategoryDatabase();
  const schema = await resolveCategorySchema();

  const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
  const categoryNameSql = quoteIdentifier(schema.categoryNameColumn);
  const categorySlugSql = schema.categorySlugColumn ? quoteIdentifier(schema.categorySlugColumn) : null;
  const categoryDescriptionSql = schema.categoryDescriptionColumn
    ? quoteIdentifier(schema.categoryDescriptionColumn)
    : null;
  const categoryParentIdSql = schema.categoryParentIdColumn
    ? quoteIdentifier(schema.categoryParentIdColumn)
    : null;
  const categoryActiveSql = schema.categoryActiveColumn
    ? quoteIdentifier(schema.categoryActiveColumn)
    : null;
  const productIdSql = quoteIdentifier(schema.productIdColumn);
  const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);
  const productActiveFilterSql = buildEnabledFilterSql("p", schema.productActiveColumn, schema.productActiveIsText);

  const whereParts: string[] = [];
  const params: Array<string> = [];

  if (search) {
    const keyword = `%${search}%`;
    if (categorySlugSql) {
      whereParts.push(`(c.${categoryNameSql} LIKE ? OR c.${categorySlugSql} LIKE ?)`);
      params.push(keyword, keyword);
    } else {
      whereParts.push(`c.${categoryNameSql} LIKE ?`);
      params.push(keyword);
    }
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const rows = (await appDataSource.query(
    `
      SELECT
        c.${categoryIdSql} AS id,
        c.${categoryNameSql} AS name,
        ${categorySlugSql ? `c.${categorySlugSql}` : "NULL"} AS slug,
        ${categoryDescriptionSql ? `c.${categoryDescriptionSql}` : "NULL"} AS description,
        ${categoryParentIdSql ? `c.${categoryParentIdSql}` : "NULL"} AS parent_id,
        ${categoryActiveSql ? `c.${categoryActiveSql}` : "1"} AS is_active,
        COALESCE(COUNT(CASE WHEN ${productActiveFilterSql} THEN p.${productIdSql} END), 0) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.${productCategoryIdSql} = c.${categoryIdSql}
      ${whereSql}
      GROUP BY
        c.${categoryIdSql},
        c.${categoryNameSql},
        ${categorySlugSql ? `c.${categorySlugSql},` : "NULL,"}
        ${categoryDescriptionSql ? `c.${categoryDescriptionSql},` : "NULL,"}
        ${categoryParentIdSql ? `c.${categoryParentIdSql},` : "NULL,"}
        ${categoryActiveSql ? `c.${categoryActiveSql}` : "1"}
      ORDER BY c.${categoryNameSql} ASC
    `,
    params,
  )) as CategoryListRow[];

  return rows.map(mapCategorySummary);
};

export const getCategoryDetailFromRepository = async (
  slugOrId: string,
): Promise<CategoryDetailDto | null> => {
  await ensureCategoryDatabase();
  const schema = await resolveCategorySchema();

  const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
  const categoryNameSql = quoteIdentifier(schema.categoryNameColumn);
  const categorySlugSql = schema.categorySlugColumn ? quoteIdentifier(schema.categorySlugColumn) : null;
  const categoryDescriptionSql = schema.categoryDescriptionColumn
    ? quoteIdentifier(schema.categoryDescriptionColumn)
    : null;
  const categoryParentIdSql = schema.categoryParentIdColumn
    ? quoteIdentifier(schema.categoryParentIdColumn)
    : null;
  const categoryActiveSql = schema.categoryActiveColumn
    ? quoteIdentifier(schema.categoryActiveColumn)
    : null;

  const productIdSql = quoteIdentifier(schema.productIdColumn);
  const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);
  const productNameSql = quoteIdentifier(schema.productNameColumn);
  const productSlugSql = schema.productSlugColumn ? quoteIdentifier(schema.productSlugColumn) : null;
  const productBasePriceSql = quoteIdentifier(schema.productBasePriceColumn);
  const productImageUrlSql = schema.productImageUrlColumn ? quoteIdentifier(schema.productImageUrlColumn) : null;
  const productStatusSql = schema.productStatusColumn ? quoteIdentifier(schema.productStatusColumn) : null;
  const productActiveFilterSql = buildEnabledFilterSql("p", schema.productActiveColumn, schema.productActiveIsText);

  const parsedId = Number(slugOrId);
  const isNumericId = Number.isInteger(parsedId) && parsedId > 0;
  let whereSql = `c.${categoryIdSql} = ?`;
  const params: Array<string | number> = [isNumericId ? parsedId : slugOrId];

  if (!isNumericId) {
    if (categorySlugSql) {
      whereSql = `c.${categorySlugSql} = ?`;
    } else {
      whereSql = `LOWER(REPLACE(c.${categoryNameSql}, ' ', '-')) = ? OR LOWER(c.${categoryNameSql}) = ?`;
      params[0] = slugOrId.toLowerCase();
      params.push(slugOrId.toLowerCase());
    }
  }

  const categoryRows = (await appDataSource.query(
    `
      SELECT
        c.${categoryIdSql} AS id,
        c.${categoryNameSql} AS name,
        ${categorySlugSql ? `c.${categorySlugSql}` : "NULL"} AS slug,
        ${categoryDescriptionSql ? `c.${categoryDescriptionSql}` : "NULL"} AS description,
        ${categoryParentIdSql ? `c.${categoryParentIdSql}` : "NULL"} AS parent_id,
        ${categoryActiveSql ? `c.${categoryActiveSql}` : "1"} AS is_active,
        0 AS product_count
      FROM categories c
      WHERE ${whereSql}
      LIMIT 1
    `,
    params,
  )) as CategoryListRow[];

  const categoryRow = categoryRows[0];
  if (!categoryRow) {
    return null;
  }

  const productRows = (await appDataSource.query(
    `
      SELECT
        p.${productIdSql} AS id,
        p.${productNameSql} AS name,
        ${productSlugSql ? `p.${productSlugSql}` : "NULL"} AS slug,
        p.${productBasePriceSql} AS base_price,
        ${productImageUrlSql ? `p.${productImageUrlSql}` : "NULL"} AS image_url,
        ${productStatusSql ? `p.${productStatusSql}` : "NULL"} AS status
      FROM products p
      WHERE p.${productCategoryIdSql} = ? AND ${productActiveFilterSql}
      ORDER BY p.${productNameSql} ASC
    `,
    [categoryRow.id],
  )) as CategoryProductRow[];

  const summary = mapCategorySummary(categoryRow);
  const products = productRows.map(mapCategoryProduct);

  return {
    ...summary,
    productCount: products.length,
    products,
  };
};

export const createCategoryInRepository = async (
  input: CreateCategoryRepositoryInput,
): Promise<number> => {
  await ensureCategoryDatabase();
  const schema = await resolveCategorySchema();

  const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
  const categoryNameSql = quoteIdentifier(schema.categoryNameColumn);
  const categorySlugSql = schema.categorySlugColumn ? quoteIdentifier(schema.categorySlugColumn) : null;
  const categoryDescriptionSql = schema.categoryDescriptionColumn
    ? quoteIdentifier(schema.categoryDescriptionColumn)
    : null;
  const categoryParentIdSql = schema.categoryParentIdColumn
    ? quoteIdentifier(schema.categoryParentIdColumn)
    : null;
  const categoryStatusSql = schema.categoryStatusColumn ? quoteIdentifier(schema.categoryStatusColumn) : null;
  const categoryActiveSql = schema.categoryActiveColumn ? quoteIdentifier(schema.categoryActiveColumn) : null;

  const nextCategoryId = await getNextCategoryId(categoryIdSql);

  const columns: string[] = [categoryIdSql, categoryNameSql];
  const values: Array<string | number | null> = [nextCategoryId, input.name];

  if (categorySlugSql) {
    columns.push(categorySlugSql);
    values.push(input.slug);
  }

  if (categoryDescriptionSql) {
    columns.push(categoryDescriptionSql);
    values.push(input.description);
  }

  if (categoryParentIdSql) {
    columns.push(categoryParentIdSql);
    values.push(input.parentId);
  }

  if (categoryStatusSql && input.status !== undefined) {
    columns.push(categoryStatusSql);
    values.push(input.status);
  }

  if (categoryActiveSql) {
    columns.push(categoryActiveSql);
    values.push(getActiveWriteValue(input.isActive ?? true, schema.categoryActiveIsText));
  }

  await appDataSource.query(
    `
      INSERT INTO categories (
        ${columns.join(", ")}
      ) VALUES (${columns.map(() => "?").join(", ")})
    `,
    values,
  );

  return nextCategoryId;
};

export const updateCategoryInRepository = async (
  categoryId: number,
  input: UpdateCategoryRepositoryInput,
): Promise<void> => {
  await ensureCategoryDatabase();
  const schema = await resolveCategorySchema();

  const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
  const categoryNameSql = quoteIdentifier(schema.categoryNameColumn);
  const categorySlugSql = schema.categorySlugColumn ? quoteIdentifier(schema.categorySlugColumn) : null;
  const categoryDescriptionSql = schema.categoryDescriptionColumn
    ? quoteIdentifier(schema.categoryDescriptionColumn)
    : null;
  const categoryParentIdSql = schema.categoryParentIdColumn
    ? quoteIdentifier(schema.categoryParentIdColumn)
    : null;
  const categoryStatusSql = schema.categoryStatusColumn ? quoteIdentifier(schema.categoryStatusColumn) : null;
  const categoryActiveSql = schema.categoryActiveColumn ? quoteIdentifier(schema.categoryActiveColumn) : null;
  const categoryUpdatedAtSql = schema.categoryUpdatedAtColumn
    ? quoteIdentifier(schema.categoryUpdatedAtColumn)
    : null;

  const setParts: string[] = [];
  const params: Array<string | number | boolean | null> = [];

  if (input.name !== undefined) {
    setParts.push(`${categoryNameSql} = ?`);
    params.push(input.name);
  }

  if (input.slug !== undefined && categorySlugSql) {
    setParts.push(`${categorySlugSql} = ?`);
    params.push(input.slug);
  }

  if (input.description !== undefined && categoryDescriptionSql) {
    setParts.push(`${categoryDescriptionSql} = ?`);
    params.push(input.description);
  }

  if (input.parentId !== undefined && categoryParentIdSql) {
    setParts.push(`${categoryParentIdSql} = ?`);
    params.push(input.parentId);
  }

  if (input.status !== undefined) {
    if (!categoryStatusSql) {
      throw new AppError("Category status column is not available in this schema.", 400);
    }
    setParts.push(`${categoryStatusSql} = ?`);
    params.push(input.status);
  }

  if (input.isActive !== undefined) {
    if (categoryActiveSql) {
      setParts.push(`${categoryActiveSql} = ?`);
      params.push(getActiveWriteValue(input.isActive, schema.categoryActiveIsText));
    } else if (categoryStatusSql && input.status === undefined) {
      const mappedStatus = pickStatusByActive(schema.categoryStatusEnumValues, input.isActive);
      if (!mappedStatus) {
        throw new AppError("Category active status column is not available in this schema.", 400);
      }
      setParts.push(`${categoryStatusSql} = ?`);
      params.push(mappedStatus);
    } else if (!categoryStatusSql) {
      throw new AppError("Category active status column is not available in this schema.", 400);
    }
  }

  if (setParts.length === 0) {
    return;
  }

  if (categoryUpdatedAtSql) {
    setParts.push(`${categoryUpdatedAtSql} = NOW()`);
  }

  params.push(categoryId);

  await appDataSource.query(
    `
      UPDATE categories
      SET ${setParts.join(", ")}
      WHERE ${categoryIdSql} = ?
    `,
    params,
  );
};

export const deleteCategoryInRepository = async (categoryId: number): Promise<void> => {
  await ensureCategoryDatabase();
  const schema = await resolveCategorySchema();

  const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
  const categoryActiveSql = schema.categoryActiveColumn ? quoteIdentifier(schema.categoryActiveColumn) : null;
  const categoryUpdatedAtSql = schema.categoryUpdatedAtColumn
    ? quoteIdentifier(schema.categoryUpdatedAtColumn)
    : null;

  if (!categoryActiveSql) {
    await appDataSource.query(
      `
        DELETE FROM categories
        WHERE ${categoryIdSql} = ?
      `,
      [categoryId],
    );
    return;
  }

  await appDataSource.query(
    `
      UPDATE categories
      SET ${categoryActiveSql} = ?${categoryUpdatedAtSql ? `, ${categoryUpdatedAtSql} = NOW()` : ""}
      WHERE ${categoryIdSql} = ?
    `,
    [getActiveWriteValue(false, schema.categoryActiveIsText), categoryId],
  );
};

export const countProductsByCategoryId = async (categoryId: number): Promise<number> => {
  await ensureCategoryDatabase();
  const schema = await resolveCategorySchema();

  const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);

  const rows = (await appDataSource.query(
    `
      SELECT COUNT(*) AS total
      FROM products
      WHERE ${productCategoryIdSql} = ?
    `,
    [categoryId],
  )) as CountRow[];

  return toNumber(rows[0]?.total);
};

export const assertCategoryExists = async (categoryId: number): Promise<void> => {
  await ensureCategoryDatabase();
  const existing = await findCategoryById(categoryId);
  if (!existing) {
    throw new AppError("Category not found.", 404);
  }
};

export const assertCategorySlugAvailable = async (
  slug: string,
  excludeCategoryId?: number,
): Promise<void> => {
  await ensureCategoryDatabase();
  const taken = await isCategorySlugTaken(slug, excludeCategoryId);
  if (taken) {
    throw new AppError("Slug is already in use by another category.", 409);
  }
};
