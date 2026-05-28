"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCategorySlugAvailable = exports.assertCategoryExists = exports.countProductsByCategoryId = exports.deleteCategoryInRepository = exports.updateCategoryInRepository = exports.createCategoryInRepository = exports.getCategoryDetailFromRepository = exports.listCategoriesFromRepository = void 0;
const database_config_1 = require("../Config/database.config");
const environment_1 = require("../Config/environment");
const errors_1 = require("../Core/errors");
let categoryDbReady = false;
let categoryDbInitPromise = null;
let categorySchemaPromise = null;
const quoteIdentifier = (identifier) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
        throw new errors_1.AppError(`Invalid SQL identifier: ${identifier}`, 500);
    }
    return `\`${identifier}\``;
};
const pickExistingColumn = (tableColumns, tableName, candidates) => {
    const columns = tableColumns.get(tableName);
    if (!columns) {
        throw new errors_1.AppError(`Missing required database table: ${tableName}`, 500);
    }
    for (const candidate of candidates) {
        if (columns.has(candidate)) {
            return candidate;
        }
    }
    throw new errors_1.AppError(`Unsupported schema on table ${tableName}. Expected one of: ${candidates.join(", ")}`, 500);
};
const pickOptionalColumn = (tableColumns, tableName, candidates) => {
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
const isTextColumnType = (value) => {
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
const getColumnType = (columnTypesByTable, tableName, columnName) => {
    if (!columnName) {
        return null;
    }
    const table = columnTypesByTable.get(tableName);
    if (!table) {
        return null;
    }
    return table.get(columnName) ?? null;
};
const getColumnDefinition = (columnDefinitionsByTable, tableName, columnName) => {
    if (!columnName) {
        return null;
    }
    const table = columnDefinitionsByTable.get(tableName);
    if (!table) {
        return null;
    }
    return table.get(columnName) ?? null;
};
const parseEnumValues = (columnDefinition) => {
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
const pickStatusByActive = (statusEnumValues, isActive) => {
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
const toNumber = (value, fallback = 0) => {
    if (value == null) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const toBoolean = (value, fallback) => {
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
const slugify = (value) => {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    return slug || "category";
};
const buildEnabledFilterSql = (tableAlias, columnName, isText) => {
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
const getActiveWriteValue = (enabled, isText) => {
    if (isText) {
        return enabled ? "active" : "inactive";
    }
    return enabled ? 1 : 0;
};
const mapCategorySummary = (row) => {
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
const mapCategoryProduct = (row) => {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug || slugify(row.name),
        basePrice: toNumber(row.base_price),
        imageUrl: row.image_url,
        status: row.status,
    };
};
const resolveCategorySchema = async () => {
    if (categorySchemaPromise) {
        return categorySchemaPromise;
    }
    categorySchemaPromise = (async () => {
        const rows = (await database_config_1.appDataSource.query(`
        SELECT
          TABLE_NAME AS table_name,
          COLUMN_NAME AS column_name,
          DATA_TYPE AS data_type,
          COLUMN_TYPE AS column_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME IN ('categories', 'products')
      `, [environment_1.environment.databaseName]));
        const columnsByTable = new Map();
        const columnTypesByTable = new Map();
        const columnDefinitionsByTable = new Map();
        for (const row of rows) {
            if (!columnsByTable.has(row.table_name)) {
                columnsByTable.set(row.table_name, new Set());
            }
            columnsByTable.get(row.table_name)?.add(row.column_name);
            if (!columnTypesByTable.has(row.table_name)) {
                columnTypesByTable.set(row.table_name, new Map());
            }
            columnTypesByTable.get(row.table_name)?.set(row.column_name, row.data_type);
            if (!columnDefinitionsByTable.has(row.table_name)) {
                columnDefinitionsByTable.set(row.table_name, new Map());
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
            categoryStatusEnumValues: parseEnumValues(getColumnDefinition(columnDefinitionsByTable, "categories", categoryStatusColumn)),
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
    }
    catch (error) {
        categorySchemaPromise = null;
        throw error;
    }
};
const ensureCategoryDatabase = async () => {
    if (categoryDbReady || database_config_1.appDataSource.isInitialized) {
        categoryDbReady = true;
        return;
    }
    if (!categoryDbInitPromise) {
        categoryDbInitPromise = (async () => {
            try {
                await database_config_1.appDataSource.initialize();
                categoryDbReady = true;
            }
            catch (error) {
                const message = error?.message ?? String(error);
                throw new errors_1.AppError(`Database unavailable: ${message}`, 503);
            }
        })().finally(() => {
            categoryDbInitPromise = null;
        });
    }
    await categoryDbInitPromise;
};
const getNextCategoryId = async (categoryIdSql) => {
    const rows = (await database_config_1.appDataSource.query(`SELECT COALESCE(MAX(${categoryIdSql}), 0) + 1 AS next_id FROM categories`));
    return toNumber(rows[0]?.next_id, 1);
};
const findCategoryById = async (categoryId) => {
    const schema = await resolveCategorySchema();
    const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
    const rows = (await database_config_1.appDataSource.query(`
      SELECT ${categoryIdSql} AS id
      FROM categories
      WHERE ${categoryIdSql} = ?
      LIMIT 1
    `, [categoryId]));
    return rows[0] ?? null;
};
const isCategorySlugTaken = async (slug, excludeCategoryId) => {
    const schema = await resolveCategorySchema();
    if (!schema.categorySlugColumn) {
        return false;
    }
    const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
    const categorySlugSql = quoteIdentifier(schema.categorySlugColumn);
    const whereParts = [`LOWER(${categorySlugSql}) = ?`];
    const params = [slug.trim().toLowerCase()];
    if (excludeCategoryId) {
        whereParts.push(`${categoryIdSql} <> ?`);
        params.push(excludeCategoryId);
    }
    const rows = (await database_config_1.appDataSource.query(`
      SELECT ${categoryIdSql} AS id
      FROM categories
      WHERE ${whereParts.join(" AND ")}
      LIMIT 1
    `, params));
    return rows.length > 0;
};
const listCategoriesFromRepository = async (search) => {
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
    const whereParts = [];
    const params = [];
    if (search) {
        const keyword = `%${search}%`;
        if (categorySlugSql) {
            whereParts.push(`(c.${categoryNameSql} LIKE ? OR c.${categorySlugSql} LIKE ?)`);
            params.push(keyword, keyword);
        }
        else {
            whereParts.push(`c.${categoryNameSql} LIKE ?`);
            params.push(keyword);
        }
    }
    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
    const rows = (await database_config_1.appDataSource.query(`
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
    `, params));
    return rows.map(mapCategorySummary);
};
exports.listCategoriesFromRepository = listCategoriesFromRepository;
const getCategoryDetailFromRepository = async (slugOrId) => {
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
    const params = [isNumericId ? parsedId : slugOrId];
    if (!isNumericId) {
        if (categorySlugSql) {
            whereSql = `c.${categorySlugSql} = ?`;
        }
        else {
            whereSql = `LOWER(REPLACE(c.${categoryNameSql}, ' ', '-')) = ? OR LOWER(c.${categoryNameSql}) = ?`;
            params[0] = slugOrId.toLowerCase();
            params.push(slugOrId.toLowerCase());
        }
    }
    const categoryRows = (await database_config_1.appDataSource.query(`
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
    `, params));
    const categoryRow = categoryRows[0];
    if (!categoryRow) {
        return null;
    }
    const productRows = (await database_config_1.appDataSource.query(`
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
    `, [categoryRow.id]));
    const summary = mapCategorySummary(categoryRow);
    const products = productRows.map(mapCategoryProduct);
    return {
        ...summary,
        productCount: products.length,
        products,
    };
};
exports.getCategoryDetailFromRepository = getCategoryDetailFromRepository;
const createCategoryInRepository = async (input) => {
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
    const columns = [categoryIdSql, categoryNameSql];
    const values = [nextCategoryId, input.name];
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
    await database_config_1.appDataSource.query(`
      INSERT INTO categories (
        ${columns.join(", ")}
      ) VALUES (${columns.map(() => "?").join(", ")})
    `, values);
    return nextCategoryId;
};
exports.createCategoryInRepository = createCategoryInRepository;
const updateCategoryInRepository = async (categoryId, input) => {
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
    const setParts = [];
    const params = [];
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
            throw new errors_1.AppError("Category status column is not available in this schema.", 400);
        }
        setParts.push(`${categoryStatusSql} = ?`);
        params.push(input.status);
    }
    if (input.isActive !== undefined) {
        if (categoryActiveSql) {
            setParts.push(`${categoryActiveSql} = ?`);
            params.push(getActiveWriteValue(input.isActive, schema.categoryActiveIsText));
        }
        else if (categoryStatusSql && input.status === undefined) {
            const mappedStatus = pickStatusByActive(schema.categoryStatusEnumValues, input.isActive);
            if (!mappedStatus) {
                throw new errors_1.AppError("Category active status column is not available in this schema.", 400);
            }
            setParts.push(`${categoryStatusSql} = ?`);
            params.push(mappedStatus);
        }
        else if (!categoryStatusSql) {
            throw new errors_1.AppError("Category active status column is not available in this schema.", 400);
        }
    }
    if (setParts.length === 0) {
        return;
    }
    if (categoryUpdatedAtSql) {
        setParts.push(`${categoryUpdatedAtSql} = NOW()`);
    }
    params.push(categoryId);
    await database_config_1.appDataSource.query(`
      UPDATE categories
      SET ${setParts.join(", ")}
      WHERE ${categoryIdSql} = ?
    `, params);
};
exports.updateCategoryInRepository = updateCategoryInRepository;
const deleteCategoryInRepository = async (categoryId) => {
    await ensureCategoryDatabase();
    const schema = await resolveCategorySchema();
    const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
    const categoryActiveSql = schema.categoryActiveColumn ? quoteIdentifier(schema.categoryActiveColumn) : null;
    const categoryUpdatedAtSql = schema.categoryUpdatedAtColumn
        ? quoteIdentifier(schema.categoryUpdatedAtColumn)
        : null;
    if (!categoryActiveSql) {
        await database_config_1.appDataSource.query(`
        DELETE FROM categories
        WHERE ${categoryIdSql} = ?
      `, [categoryId]);
        return;
    }
    await database_config_1.appDataSource.query(`
      UPDATE categories
      SET ${categoryActiveSql} = ?${categoryUpdatedAtSql ? `, ${categoryUpdatedAtSql} = NOW()` : ""}
      WHERE ${categoryIdSql} = ?
    `, [getActiveWriteValue(false, schema.categoryActiveIsText), categoryId]);
};
exports.deleteCategoryInRepository = deleteCategoryInRepository;
const countProductsByCategoryId = async (categoryId) => {
    await ensureCategoryDatabase();
    const schema = await resolveCategorySchema();
    const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);
    const rows = (await database_config_1.appDataSource.query(`
      SELECT COUNT(*) AS total
      FROM products
      WHERE ${productCategoryIdSql} = ?
    `, [categoryId]));
    return toNumber(rows[0]?.total);
};
exports.countProductsByCategoryId = countProductsByCategoryId;
const assertCategoryExists = async (categoryId) => {
    await ensureCategoryDatabase();
    const existing = await findCategoryById(categoryId);
    if (!existing) {
        throw new errors_1.AppError("Category not found.", 404);
    }
};
exports.assertCategoryExists = assertCategoryExists;
const assertCategorySlugAvailable = async (slug, excludeCategoryId) => {
    await ensureCategoryDatabase();
    const taken = await isCategorySlugTaken(slug, excludeCategoryId);
    if (taken) {
        throw new errors_1.AppError("Slug is already in use by another category.", 409);
    }
};
exports.assertCategorySlugAvailable = assertCategorySlugAvailable;
