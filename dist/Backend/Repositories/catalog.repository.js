"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertProductSlugAvailable = exports.assertProductExists = exports.softDeleteProductInRepository = exports.updateProductInRepository = exports.createProductInRepository = exports.getProductDetailFromRepository = exports.listProductsFromRepository = void 0;
const database_config_1 = require("../Config/database.config");
const environment_1 = require("../Config/environment");
const errors_1 = require("../Core/errors");
let catalogDbReady = false;
let catalogDbInitPromise = null;
let catalogSchemaPromise = null;
const SORT_TO_SQL = {
    newest: "p.created_at DESC",
    price_asc: "display_price ASC",
    price_desc: "display_price DESC",
    name_asc: "p.name ASC",
    name_desc: "p.name DESC",
    rating_desc: "average_rating DESC",
};
const toNumber = (value, fallback = 0) => {
    if (value == null) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const toIsoString = (value) => {
    if (value == null) {
        return new Date().toISOString();
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
    }
    return new Date().toISOString();
};
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
const buildEnabledFilterSql = (tableAlias, columnName, isText) => {
    if (!columnName) {
        return "1 = 1";
    }
    const qColumn = quoteIdentifier(columnName);
    const scopedColumn = tableAlias ? `${tableAlias}.${qColumn}` : qColumn;
    if (isText) {
        return `LOWER(COALESCE(${scopedColumn}, '')) IN ('active', 'approved', '1', 'true', 'yes')`;
    }
    return `${scopedColumn} = 1`;
};
const getActiveWriteValue = (enabled, isText) => {
    if (isText) {
        return enabled ? "active" : "inactive";
    }
    return enabled ? 1 : 0;
};
const slugify = (value) => {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    return slug || "product";
};
const resolveCatalogSchema = async () => {
    if (catalogSchemaPromise) {
        return catalogSchemaPromise;
    }
    catalogSchemaPromise = (async () => {
        const rows = (await database_config_1.appDataSource.query(`
        SELECT
          TABLE_NAME AS table_name,
          COLUMN_NAME AS column_name,
          DATA_TYPE AS data_type,
          COLUMN_TYPE AS column_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME IN ('products', 'categories', 'product_variants', 'reviews', 'users')
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
        const productStatusColumn = pickOptionalColumn(columnsByTable, "products", ["status"]);
        const productActiveColumn = pickOptionalColumn(columnsByTable, "products", ["is_active", "active"]);
        const variantSkuColumn = pickExistingColumn(columnsByTable, "product_variants", ["sku"]);
        const variantPriceColumn = pickExistingColumn(columnsByTable, "product_variants", ["price", "extra_price"]);
        const variantNameColumn = pickOptionalColumn(columnsByTable, "product_variants", ["name"]);
        const variantAttributesJsonColumn = pickOptionalColumn(columnsByTable, "product_variants", ["attributes_json"]);
        const variantSizeColumn = pickOptionalColumn(columnsByTable, "product_variants", ["size"]);
        const variantColorColumn = pickOptionalColumn(columnsByTable, "product_variants", ["color"]);
        const variantActiveColumn = pickOptionalColumn(columnsByTable, "product_variants", ["is_active", "active"]);
        const reviewTitleColumn = pickOptionalColumn(columnsByTable, "reviews", ["title", "review_title"]);
        const reviewCommentColumn = pickExistingColumn(columnsByTable, "reviews", ["comment", "review_comment"]);
        const reviewApprovedColumn = pickOptionalColumn(columnsByTable, "reviews", ["is_approved", "approved"]);
        return {
            productIdColumn: pickExistingColumn(columnsByTable, "products", ["id", "product_id"]),
            productCategoryIdColumn: pickExistingColumn(columnsByTable, "products", ["category_id", "categoryId"]),
            productNameColumn: pickExistingColumn(columnsByTable, "products", ["name", "product_name"]),
            productSlugColumn: pickOptionalColumn(columnsByTable, "products", ["slug"]),
            productUpdatedAtColumn: pickOptionalColumn(columnsByTable, "products", ["updated_at"]),
            productStatusColumn,
            productStatusEnumValues: parseEnumValues(getColumnDefinition(columnDefinitionsByTable, "products", productStatusColumn)),
            productActiveColumn,
            productActiveIsText: isTextColumnType(getColumnType(columnTypesByTable, "products", productActiveColumn) ?? undefined),
            categoryIdColumn: pickExistingColumn(columnsByTable, "categories", ["id", "category_id"]),
            categoryNameColumn: pickExistingColumn(columnsByTable, "categories", ["name", "category_name"]),
            categorySlugColumn: pickOptionalColumn(columnsByTable, "categories", ["slug"]),
            variantIdColumn: pickExistingColumn(columnsByTable, "product_variants", ["id", "variant_id", "product_variant_id"]),
            variantProductIdColumn: pickExistingColumn(columnsByTable, "product_variants", ["product_id", "productId"]),
            variantSkuColumn,
            variantPriceColumn,
            variantNameColumn,
            variantAttributesJsonColumn,
            variantSizeColumn,
            variantColorColumn,
            variantActiveColumn,
            variantActiveIsText: isTextColumnType(getColumnType(columnTypesByTable, "product_variants", variantActiveColumn) ?? undefined),
            reviewIdColumn: pickExistingColumn(columnsByTable, "reviews", ["id", "review_id"]),
            reviewProductIdColumn: pickExistingColumn(columnsByTable, "reviews", ["product_id", "productId"]),
            reviewUserIdColumn: pickExistingColumn(columnsByTable, "reviews", ["user_id", "userId"]),
            reviewTitleColumn,
            reviewCommentColumn,
            reviewApprovedColumn,
            reviewApprovedIsText: isTextColumnType(getColumnType(columnTypesByTable, "reviews", reviewApprovedColumn) ?? undefined),
            userIdColumn: pickExistingColumn(columnsByTable, "users", ["user_id", "id"]),
            userFullNameColumn: pickExistingColumn(columnsByTable, "users", ["full_name", "name"]),
        };
    })();
    try {
        return await catalogSchemaPromise;
    }
    catch (error) {
        catalogSchemaPromise = null;
        throw error;
    }
};
const ensureCatalogDatabase = async () => {
    if (catalogDbReady || database_config_1.appDataSource.isInitialized) {
        catalogDbReady = true;
        return;
    }
    if (!catalogDbInitPromise) {
        catalogDbInitPromise = (async () => {
            try {
                await database_config_1.appDataSource.initialize();
                catalogDbReady = true;
            }
            catch (error) {
                const message = error?.message ?? String(error);
                throw new errors_1.AppError(`Database unavailable: ${message}`, 503);
            }
        })().finally(() => {
            catalogDbInitPromise = null;
        });
    }
    await catalogDbInitPromise;
};
const mapProductSummary = (row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug || slugify(row.name),
    description: row.description,
    basePrice: toNumber(row.base_price),
    price: toNumber(row.display_price, toNumber(row.base_price)),
    imageUrl: row.image_url,
    category: {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_slug,
    },
    rating: {
        average: Number(toNumber(row.average_rating).toFixed(2)),
        count: toNumber(row.review_count),
    },
});
const mapVariant = (row) => {
    let attributes = null;
    if (row.attributes_json) {
        try {
            const parsed = JSON.parse(row.attributes_json);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                attributes = parsed;
            }
        }
        catch {
            attributes = null;
        }
    }
    if (!attributes) {
        const fallbackAttributes = {};
        if (row.size) {
            fallbackAttributes.size = row.size;
        }
        if (row.color) {
            fallbackAttributes.color = row.color;
        }
        attributes = Object.keys(fallbackAttributes).length > 0 ? fallbackAttributes : null;
    }
    const fallbackName = [row.size, row.color].filter((part) => Boolean(part)).join(" / ");
    return {
        id: row.id,
        productId: row.product_id,
        sku: row.sku,
        name: row.name || (fallbackName || null),
        price: toNumber(row.price),
        attributes,
    };
};
const mapReview = (row) => ({
    id: row.id,
    rating: toNumber(row.rating),
    title: row.title,
    comment: row.comment,
    userName: row.user_name,
    createdAt: toIsoString(row.created_at),
});
const buildFilterQuery = (input, productCategoryIdSql, productNameSql, productSlugSql, categorySlugSql, productActiveFilterSql) => {
    const conditions = [productActiveFilterSql];
    const params = [];
    if (input.search) {
        const keyword = `%${input.search}%`;
        if (productSlugSql) {
            conditions.push(`(p.${productNameSql} LIKE ? OR p.${productSlugSql} LIKE ?)`);
            params.push(keyword, keyword);
        }
        else {
            conditions.push(`p.${productNameSql} LIKE ?`);
            params.push(keyword);
        }
    }
    if (input.category) {
        const maybeId = Number(input.category);
        if (Number.isInteger(maybeId) && maybeId > 0) {
            conditions.push(`p.${productCategoryIdSql} = ?`);
            params.push(maybeId);
        }
        else if (categorySlugSql) {
            conditions.push(`c.${categorySlugSql} = ?`);
            params.push(input.category);
        }
    }
    if (input.minPrice != null) {
        conditions.push("p.base_price >= ?");
        params.push(input.minPrice);
    }
    if (input.maxPrice != null) {
        conditions.push("p.base_price <= ?");
        params.push(input.maxPrice);
    }
    return {
        whereSql: conditions.join(" AND "),
        params,
    };
};
const listProductsFromRepository = async (input) => {
    await ensureCatalogDatabase();
    const schema = await resolveCatalogSchema();
    const productNameSql = quoteIdentifier(schema.productNameColumn);
    const productSlugSql = schema.productSlugColumn ? quoteIdentifier(schema.productSlugColumn) : null;
    const categoryNameSql = quoteIdentifier(schema.categoryNameColumn);
    const categorySlugSql = schema.categorySlugColumn ? quoteIdentifier(schema.categorySlugColumn) : null;
    const orderBySqlMap = {
        newest: "p.created_at DESC",
        price_asc: "display_price ASC",
        price_desc: "display_price DESC",
        name_asc: `p.${productNameSql} ASC`,
        name_desc: `p.${productNameSql} DESC`,
        rating_desc: "average_rating DESC",
    };
    const orderBySql = orderBySqlMap[input.sort];
    const offset = (input.page - 1) * input.limit;
    const productIdSql = quoteIdentifier(schema.productIdColumn);
    const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);
    const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
    const variantProductIdSql = quoteIdentifier(schema.variantProductIdColumn);
    const variantPriceSql = quoteIdentifier(schema.variantPriceColumn);
    const reviewProductIdSql = quoteIdentifier(schema.reviewProductIdColumn);
    const productActiveFilterSql = buildEnabledFilterSql("p", schema.productActiveColumn, schema.productActiveIsText);
    const variantActiveFilterSql = buildEnabledFilterSql("pv", schema.variantActiveColumn, schema.variantActiveIsText);
    const reviewApprovedFilterSql = buildEnabledFilterSql("", schema.reviewApprovedColumn, schema.reviewApprovedIsText);
    const { whereSql, params } = buildFilterQuery(input, productCategoryIdSql, productNameSql, productSlugSql, categorySlugSql, productActiveFilterSql);
    const countSql = `
    SELECT COUNT(*) AS total
    FROM products p
    LEFT JOIN categories c ON c.${categoryIdSql} = p.${productCategoryIdSql}
    WHERE ${whereSql}
  `;
    const countRows = (await database_config_1.appDataSource.query(countSql, params));
    const total = toNumber(countRows[0]?.total);
    const rowsSql = `
    SELECT
      p.${productIdSql} AS id,
      p.${productCategoryIdSql} AS category_id,
      p.${productNameSql} AS name,
      ${productSlugSql ? `p.${productSlugSql}` : "NULL"} AS slug,
      p.description,
      p.base_price,
      p.image_url,
      ${schema.productActiveColumn
        ? `p.${quoteIdentifier(schema.productActiveColumn)} AS is_active,`
        : "1 AS is_active,"}
      p.created_at,
      ${schema.productUpdatedAtColumn ? `p.${quoteIdentifier(schema.productUpdatedAtColumn)}` : "NULL"} AS updated_at,
      c.${categoryNameSql} AS category_name,
      ${categorySlugSql ? `c.${categorySlugSql}` : "NULL"} AS category_slug,
      COALESCE(rv.average_rating, 0) AS average_rating,
      COALESCE(rv.review_count, 0) AS review_count,
      COALESCE(MIN(CASE WHEN ${variantActiveFilterSql} THEN pv.${variantPriceSql} END), p.base_price) AS display_price
    FROM products p
    LEFT JOIN categories c ON c.${categoryIdSql} = p.${productCategoryIdSql}
    LEFT JOIN product_variants pv ON pv.${variantProductIdSql} = p.${productIdSql}
    LEFT JOIN (
      SELECT
        ${reviewProductIdSql} AS product_id,
        AVG(rating) AS average_rating,
        COUNT(*) AS review_count
      FROM reviews
      WHERE ${reviewApprovedFilterSql}
      GROUP BY ${reviewProductIdSql}
    ) rv ON rv.product_id = p.${productIdSql}
    WHERE ${whereSql}
    GROUP BY
      p.${productIdSql},
      p.${productCategoryIdSql},
      p.${productNameSql},
      ${productSlugSql ? `p.${productSlugSql},` : ""}
      p.description,
      p.base_price,
      p.image_url,
      ${schema.productActiveColumn ? `p.${quoteIdentifier(schema.productActiveColumn)}` : "1"},
      p.created_at,
      ${schema.productUpdatedAtColumn ? `p.${quoteIdentifier(schema.productUpdatedAtColumn)},` : ""}
      c.${categoryNameSql},
      ${categorySlugSql ? `c.${categorySlugSql}` : "NULL"},
      rv.average_rating,
      rv.review_count
    ORDER BY ${orderBySql}
    LIMIT ? OFFSET ?
  `;
    const rows = (await database_config_1.appDataSource.query(rowsSql, [...params, input.limit, offset]));
    return {
        items: rows.map(mapProductSummary),
        total,
    };
};
exports.listProductsFromRepository = listProductsFromRepository;
const getProductDetailFromRepository = async (slugOrId) => {
    await ensureCatalogDatabase();
    const schema = await resolveCatalogSchema();
    const productIdSql = quoteIdentifier(schema.productIdColumn);
    const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);
    const productNameSql = quoteIdentifier(schema.productNameColumn);
    const productSlugSql = schema.productSlugColumn ? quoteIdentifier(schema.productSlugColumn) : null;
    const categoryIdSql = quoteIdentifier(schema.categoryIdColumn);
    const categoryNameSql = quoteIdentifier(schema.categoryNameColumn);
    const categorySlugSql = schema.categorySlugColumn ? quoteIdentifier(schema.categorySlugColumn) : null;
    const variantIdSql = quoteIdentifier(schema.variantIdColumn);
    const variantProductIdSql = quoteIdentifier(schema.variantProductIdColumn);
    const variantSkuSql = quoteIdentifier(schema.variantSkuColumn);
    const variantPriceSql = quoteIdentifier(schema.variantPriceColumn);
    const variantNameSql = schema.variantNameColumn ? quoteIdentifier(schema.variantNameColumn) : null;
    const variantAttributesJsonSql = schema.variantAttributesJsonColumn
        ? quoteIdentifier(schema.variantAttributesJsonColumn)
        : null;
    const variantSizeSql = schema.variantSizeColumn ? quoteIdentifier(schema.variantSizeColumn) : null;
    const variantColorSql = schema.variantColorColumn ? quoteIdentifier(schema.variantColorColumn) : null;
    const reviewIdSql = quoteIdentifier(schema.reviewIdColumn);
    const reviewProductIdSql = quoteIdentifier(schema.reviewProductIdColumn);
    const reviewUserIdSql = quoteIdentifier(schema.reviewUserIdColumn);
    const reviewTitleSql = schema.reviewTitleColumn ? quoteIdentifier(schema.reviewTitleColumn) : null;
    const reviewCommentSql = quoteIdentifier(schema.reviewCommentColumn);
    const productActiveFilterSql = buildEnabledFilterSql("p", schema.productActiveColumn, schema.productActiveIsText);
    const variantActiveFilterSql = buildEnabledFilterSql("", schema.variantActiveColumn, schema.variantActiveIsText);
    const reviewApprovedFilterSql = buildEnabledFilterSql("", schema.reviewApprovedColumn, schema.reviewApprovedIsText);
    const userIdSql = quoteIdentifier(schema.userIdColumn);
    const userFullNameSql = quoteIdentifier(schema.userFullNameColumn);
    const parsedId = Number(slugOrId);
    const isNumericId = Number.isInteger(parsedId) && parsedId > 0;
    let productWhere = `p.${productIdSql} = ?`;
    const productParams = [isNumericId ? parsedId : slugOrId];
    if (!isNumericId) {
        if (productSlugSql) {
            productWhere = `p.${productSlugSql} = ?`;
        }
        else {
            productWhere = `LOWER(REPLACE(p.${productNameSql}, ' ', '-')) = ? OR LOWER(p.${productNameSql}) = ?`;
            productParams[0] = slugOrId.toLowerCase();
            productParams.push(slugOrId.toLowerCase());
        }
    }
    const detailSql = `
    SELECT
      p.${productIdSql} AS id,
      p.${productCategoryIdSql} AS category_id,
      p.${productNameSql} AS name,
      ${productSlugSql ? `p.${productSlugSql}` : "NULL"} AS slug,
      p.description,
      p.base_price,
      p.image_url,
      ${schema.productActiveColumn
        ? `p.${quoteIdentifier(schema.productActiveColumn)} AS is_active,`
        : "1 AS is_active,"}
      p.created_at,
      ${schema.productUpdatedAtColumn ? `p.${quoteIdentifier(schema.productUpdatedAtColumn)}` : "NULL"} AS updated_at,
      c.${categoryNameSql} AS category_name,
      ${categorySlugSql ? `c.${categorySlugSql}` : "NULL"} AS category_slug,
      COALESCE(rv.average_rating, 0) AS average_rating,
      COALESCE(rv.review_count, 0) AS review_count,
      COALESCE(vp.min_price, p.base_price) AS display_price
    FROM products p
    LEFT JOIN categories c ON c.${categoryIdSql} = p.${productCategoryIdSql}
    LEFT JOIN (
      SELECT
        ${reviewProductIdSql} AS product_id,
        AVG(rating) AS average_rating,
        COUNT(*) AS review_count
      FROM reviews
      WHERE ${reviewApprovedFilterSql}
      GROUP BY ${reviewProductIdSql}
    ) rv ON rv.product_id = p.${productIdSql}
    LEFT JOIN (
      SELECT
        ${variantProductIdSql} AS product_id,
        MIN(${variantPriceSql}) AS min_price
      FROM product_variants
      WHERE ${variantActiveFilterSql}
      GROUP BY ${variantProductIdSql}
    ) vp ON vp.product_id = p.${productIdSql}
    WHERE ${productActiveFilterSql} AND (${productWhere})
    LIMIT 1
  `;
    const detailRows = (await database_config_1.appDataSource.query(detailSql, productParams));
    const detailRow = detailRows[0];
    if (!detailRow) {
        return null;
    }
    const variantsSql = `
    SELECT
      ${variantIdSql} AS id,
      ${variantProductIdSql} AS product_id,
      ${variantSkuSql} AS sku,
      ${variantNameSql ? variantNameSql : "NULL"} AS name,
      ${variantPriceSql} AS price,
      ${variantAttributesJsonSql ? variantAttributesJsonSql : "NULL"} AS attributes_json,
      ${variantSizeSql ? variantSizeSql : "NULL"} AS size,
      ${variantColorSql ? variantColorSql : "NULL"} AS color
    FROM product_variants
    WHERE ${variantProductIdSql} = ? AND ${buildEnabledFilterSql("", schema.variantActiveColumn, schema.variantActiveIsText)}
    ORDER BY price ASC, id ASC
  `;
    const reviewSql = `
    SELECT
      r.${reviewIdSql} AS id,
      r.rating,
      ${reviewTitleSql ? `r.${reviewTitleSql}` : "NULL"} AS title,
      r.${reviewCommentSql} AS comment,
      u.${userFullNameSql} AS user_name,
      r.created_at
    FROM reviews r
    LEFT JOIN users u ON u.${userIdSql} = r.${reviewUserIdSql}
    WHERE r.${reviewProductIdSql} = ? AND ${buildEnabledFilterSql("r", schema.reviewApprovedColumn, schema.reviewApprovedIsText)}
    ORDER BY r.created_at DESC
    LIMIT 5
  `;
    const [variantRows, reviewRows] = await Promise.all([
        database_config_1.appDataSource.query(variantsSql, [detailRow.id]),
        database_config_1.appDataSource.query(reviewSql, [detailRow.id]),
    ]);
    const base = mapProductSummary(detailRow);
    return {
        ...base,
        createdAt: toIsoString(detailRow.created_at),
        updatedAt: toIsoString(detailRow.updated_at ?? detailRow.created_at),
        variants: variantRows.map(mapVariant),
        reviews: reviewRows.map(mapReview),
    };
};
exports.getProductDetailFromRepository = getProductDetailFromRepository;
const getNextProductId = async (productIdSql) => {
    const rows = (await database_config_1.appDataSource.query(`SELECT COALESCE(MAX(${productIdSql}), 0) + 1 AS next_id FROM products`));
    return toNumber(rows[0]?.next_id, 1);
};
const findProductById = async (productId) => {
    const schema = await resolveCatalogSchema();
    const productIdSql = quoteIdentifier(schema.productIdColumn);
    const productSlugSql = schema.productSlugColumn ? quoteIdentifier(schema.productSlugColumn) : null;
    const productActiveSelectSql = schema.productActiveColumn
        ? `.${quoteIdentifier(schema.productActiveColumn)}`
        : "";
    const rows = (await database_config_1.appDataSource.query(`
      SELECT
        ${productIdSql} AS id,
        ${productSlugSql ? productSlugSql : "NULL"} AS slug,
        image_url,
        ${schema.productActiveColumn ? `products${productActiveSelectSql}` : "1"} AS is_active
      FROM products
      WHERE ${productIdSql} = ?
      LIMIT 1
    `, [productId]));
    return rows[0] ?? null;
};
const isSlugTaken = async (slug, excludeProductId) => {
    const schema = await resolveCatalogSchema();
    if (!schema.productSlugColumn) {
        return false;
    }
    const productIdSql = quoteIdentifier(schema.productIdColumn);
    const productSlugSql = quoteIdentifier(schema.productSlugColumn);
    const normalizedSlug = slug.trim().toLowerCase();
    const whereParts = [`LOWER(${productSlugSql}) = ?`];
    const params = [normalizedSlug];
    if (excludeProductId) {
        whereParts.push(`${productIdSql} <> ?`);
        params.push(excludeProductId);
    }
    const rows = (await database_config_1.appDataSource.query(`
      SELECT ${productIdSql} AS id
      FROM products
      WHERE ${whereParts.join(" AND ")}
      LIMIT 1
    `, params));
    return rows.length > 0;
};
const createProductInRepository = async (input) => {
    await ensureCatalogDatabase();
    const schema = await resolveCatalogSchema();
    const productIdSql = quoteIdentifier(schema.productIdColumn);
    const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);
    const productNameSql = quoteIdentifier(schema.productNameColumn);
    const productSlugSql = schema.productSlugColumn ? quoteIdentifier(schema.productSlugColumn) : null;
    const productStatusSql = schema.productStatusColumn ? quoteIdentifier(schema.productStatusColumn) : null;
    const productActiveSql = schema.productActiveColumn ? quoteIdentifier(schema.productActiveColumn) : null;
    const nextProductId = await getNextProductId(productIdSql);
    const columns = [
        productIdSql,
        productCategoryIdSql,
        productNameSql,
        "description",
        "base_price",
        "image_url",
    ];
    const values = [
        nextProductId,
        input.categoryId,
        input.name,
        input.description,
        input.basePrice,
        input.imageUrl,
    ];
    if (productSlugSql) {
        columns.push(productSlugSql);
        values.push(input.slug);
    }
    if (productStatusSql && input.status !== undefined) {
        columns.push(productStatusSql);
        values.push(input.status);
    }
    if (productActiveSql) {
        columns.push(productActiveSql);
        values.push(getActiveWriteValue(true, schema.productActiveIsText));
    }
    await database_config_1.appDataSource.query(`
      INSERT INTO products (
        ${columns.join(", ")}
      ) VALUES (${columns.map(() => "?").join(", ")})
    `, values);
    return nextProductId;
};
exports.createProductInRepository = createProductInRepository;
const updateProductInRepository = async (productId, input) => {
    await ensureCatalogDatabase();
    const schema = await resolveCatalogSchema();
    const productIdSql = quoteIdentifier(schema.productIdColumn);
    const productCategoryIdSql = quoteIdentifier(schema.productCategoryIdColumn);
    const productNameSql = quoteIdentifier(schema.productNameColumn);
    const productSlugSql = schema.productSlugColumn ? quoteIdentifier(schema.productSlugColumn) : null;
    const productStatusSql = schema.productStatusColumn ? quoteIdentifier(schema.productStatusColumn) : null;
    const productActiveSql = schema.productActiveColumn ? quoteIdentifier(schema.productActiveColumn) : null;
    const productUpdatedAtSql = schema.productUpdatedAtColumn ? quoteIdentifier(schema.productUpdatedAtColumn) : null;
    const setParts = [];
    const params = [];
    if (input.name !== undefined) {
        setParts.push(`${productNameSql} = ?`);
        params.push(input.name);
    }
    if (input.slug !== undefined) {
        if (productSlugSql) {
            setParts.push(`${productSlugSql} = ?`);
            params.push(input.slug);
        }
    }
    if (input.description !== undefined) {
        setParts.push("description = ?");
        params.push(input.description);
    }
    if (input.basePrice !== undefined) {
        setParts.push("base_price = ?");
        params.push(input.basePrice);
    }
    if (input.categoryId !== undefined) {
        setParts.push(`${productCategoryIdSql} = ?`);
        params.push(input.categoryId);
    }
    if (input.imageUrl !== undefined) {
        setParts.push("image_url = ?");
        params.push(input.imageUrl);
    }
    if (input.status !== undefined) {
        if (!productStatusSql) {
            throw new errors_1.AppError("Product status column is not available in this schema.", 400);
        }
        setParts.push(`${productStatusSql} = ?`);
        params.push(input.status);
    }
    if (input.isActive !== undefined) {
        if (productActiveSql) {
            setParts.push(`${productActiveSql} = ?`);
            params.push(getActiveWriteValue(input.isActive, schema.productActiveIsText));
        }
        else if (productStatusSql && input.status === undefined) {
            const mappedStatus = pickStatusByActive(schema.productStatusEnumValues, input.isActive);
            if (!mappedStatus) {
                throw new errors_1.AppError("Product active status column is not available in this schema.", 400);
            }
            setParts.push(`${productStatusSql} = ?`);
            params.push(mappedStatus);
        }
        else if (!productStatusSql) {
            throw new errors_1.AppError("Product active status column is not available in this schema.", 400);
        }
    }
    if (setParts.length === 0) {
        return;
    }
    if (productUpdatedAtSql) {
        setParts.push(`${productUpdatedAtSql} = NOW()`);
    }
    params.push(productId);
    await database_config_1.appDataSource.query(`
      UPDATE products
      SET ${setParts.join(", ")}
      WHERE ${productIdSql} = ?
    `, params);
};
exports.updateProductInRepository = updateProductInRepository;
const softDeleteProductInRepository = async (productId) => {
    await ensureCatalogDatabase();
    const schema = await resolveCatalogSchema();
    const productIdSql = quoteIdentifier(schema.productIdColumn);
    const productActiveSql = schema.productActiveColumn ? quoteIdentifier(schema.productActiveColumn) : null;
    const productUpdatedAtSql = schema.productUpdatedAtColumn ? quoteIdentifier(schema.productUpdatedAtColumn) : null;
    if (!productActiveSql) {
        await database_config_1.appDataSource.query(`
        DELETE FROM products
        WHERE ${productIdSql} = ?
      `, [productId]);
        return;
    }
    await database_config_1.appDataSource.query(`
      UPDATE products
      SET ${productActiveSql} = ?${productUpdatedAtSql ? `, ${productUpdatedAtSql} = NOW()` : ""}
      WHERE ${productIdSql} = ?
    `, [getActiveWriteValue(false, schema.productActiveIsText), productId]);
};
exports.softDeleteProductInRepository = softDeleteProductInRepository;
const assertProductExists = async (productId) => {
    await ensureCatalogDatabase();
    const existingProduct = await findProductById(productId);
    if (!existingProduct) {
        throw new errors_1.AppError("Product not found.", 404);
    }
};
exports.assertProductExists = assertProductExists;
const assertProductSlugAvailable = async (slug, excludeProductId) => {
    await ensureCatalogDatabase();
    const taken = await isSlugTaken(slug, excludeProductId);
    if (taken) {
        throw new errors_1.AppError("Slug is already in use by another product.", 409);
    }
};
exports.assertProductSlugAvailable = assertProductSlugAvailable;
