import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";

export interface ProductRecord extends RowDataPacket {
  id: number;
  categoryId: number | null;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isActive: number | boolean;
  categoryName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariantRecord extends RowDataPacket {
  id: number;
  productId: number;
  sku: string;
  name: string | null;
  price: number;
  attributesJson: string | null;
  isActive: number | boolean;
}

export interface StockRecord extends RowDataPacket {
  quantity: number;
  reservedQuantity: number;
}

let databaseInitPromise: Promise<void> | null = null;
let favoritesTableReady = false;

const ensureDatabase = async (): Promise<void> => {
  if (appDataSource.isInitialized) {
    return;
  }

  if (!databaseInitPromise) {
    databaseInitPromise = appDataSource
      .initialize()
      .then(() => undefined)
      .finally(() => {
        databaseInitPromise = null;
      });
  }

  try {
    await databaseInitPromise;
  } catch (error) {
    const message = (error as { message?: string })?.message ?? String(error);
    throw new AppError(`Database unavailable: ${message}`, 503);
  }
};

const ensureFavoritesTable = async (): Promise<void> => {
  if (favoritesTableReady) {
    return;
  }

  await ensureDatabase();
  await appDataSource.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      favorite_id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_favorites_user_product (user_id, product_id)
    )
  `);

  favoritesTableReady = true;
};

export interface ProductFilters {
  search?: string;
  category?: string;
  includeInactive?: boolean;
}

const productSelect = `
  SELECT
    p.product_id AS id,
    p.category_id AS categoryId,
    p.name,
    p.slug,
    p.description,
    p.base_price AS basePrice,
    p.image_url AS imageUrl,
    p.is_active AS isActive,
    c.name AS categoryName,
    p.created_at AS createdAt,
    p.updated_at AS updatedAt
  FROM products p
  LEFT JOIN categories c ON c.category_id = p.category_id
`;

export const findProducts = async (filters: ProductFilters): Promise<ProductRecord[]> => {
  await ensureDatabase();

  const where = filters.includeInactive ? ["1 = 1"] : ["p.is_active = 1"];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    where.push("p.name LIKE ?");
    params.push(`%${filters.search.trim()}%`);
  }

  if (filters.category?.trim()) {
    where.push("LOWER(c.name) = LOWER(?)");
    params.push(filters.category.trim());
  }

  return appDataSource.query(
    `${productSelect} WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC`,
    params,
  ) as Promise<ProductRecord[]>;
};

export const findProductById = async (productId: number): Promise<ProductRecord | null> => {
  await ensureDatabase();

  const rows = (await appDataSource.query(
    `${productSelect} WHERE p.product_id = ? AND p.is_active = 1 LIMIT 1`,
    [productId],
  )) as ProductRecord[];

  return rows[0] ?? null;
};

export const findAdminProductById = async (productId: number): Promise<ProductRecord | null> => {
  await ensureDatabase();

  const rows = (await appDataSource.query(
    `${productSelect} WHERE p.product_id = ? LIMIT 1`,
    [productId],
  )) as ProductRecord[];

  return rows[0] ?? null;
};

export const findCategoryIdByName = async (categoryName: string): Promise<number | null> => {
  await ensureDatabase();

  const rows = (await appDataSource.query(
    "SELECT category_id AS categoryId FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1",
    [categoryName],
  )) as Array<{ categoryId: number }>;

  return rows[0]?.categoryId == null ? null : Number(rows[0].categoryId);
};

export const findProductVariants = async (productId: number): Promise<ProductVariantRecord[]> => {
  await ensureDatabase();

  return appDataSource.query(
    `
      SELECT
        product_variant_id AS id,
        product_id AS productId,
        sku,
        name,
        price,
        attributes_json AS attributesJson,
        is_active AS isActive
      FROM product_variants
      WHERE product_id = ? AND is_active = 1
      ORDER BY product_variant_id ASC
    `,
    [productId],
  ) as Promise<ProductVariantRecord[]>;
};

export const findProductVariantById = async (
  productId: number,
  productVariantId: number,
): Promise<ProductVariantRecord | null> => {
  const variants = await findProductVariants(productId);
  return variants.find((variant) => Number(variant.id) === productVariantId) ?? null;
};

export const findAvailableStock = async (
  productId: number,
  productVariantId: number | null,
): Promise<number> => {
  await ensureDatabase();

  const rows = (await appDataSource.query(
    `
      SELECT
        COALESCE(SUM(quantity), 0) AS quantity,
        COALESCE(SUM(reserved_quantity), 0) AS reservedQuantity
      FROM stocks
      WHERE product_id = ?
        AND (
          (? IS NULL AND product_variant_id IS NULL)
          OR product_variant_id = ?
        )
    `,
    [productId, productVariantId, productVariantId],
  )) as StockRecord[];

  const stock = rows[0];
  return Math.max(0, Number(stock?.quantity ?? 0) - Number(stock?.reservedQuantity ?? 0));
};

const getNextId = async (tableName: string, idColumn: string): Promise<number> => {
  const rows = (await appDataSource.query(
    `SELECT COALESCE(MAX(${idColumn}), 0) + 1 AS nextId FROM ${tableName}`,
  )) as Array<{ nextId: number }>;

  return Number(rows[0]?.nextId ?? 1);
};

export interface CreateAdminProductInput {
  categoryId: number | null;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  isActive: boolean;
}

export interface UpdateAdminProductInput {
  categoryId?: number | null;
  name?: string;
  slug?: string;
  description?: string | null;
  basePrice?: number;
  imageUrl?: string | null;
  isActive?: boolean;
}

export const createAdminProduct = async (input: CreateAdminProductInput): Promise<ProductRecord> => {
  await ensureDatabase();

  const productId = await getNextId("products", "product_id");

  await appDataSource.query(
    `
      INSERT INTO products (
        product_id,
        category_id,
        name,
        slug,
        description,
        base_price,
        image_url,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [
      productId,
      input.categoryId,
      input.name,
      input.slug,
      input.description,
      input.basePrice,
      input.imageUrl,
      input.isActive ? 1 : 0,
    ],
  );

  const product = await findAdminProductById(productId);
  if (!product) {
    throw new AppError("Product was created but could not be loaded.", 500);
  }

  return product;
};

export const updateAdminProduct = async (
  productId: number,
  input: UpdateAdminProductInput,
): Promise<ProductRecord> => {
  await ensureDatabase();

  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.categoryId !== undefined) {
    updates.push("category_id = ?");
    params.push(input.categoryId ?? null);
  }
  if (input.name != null) {
    updates.push("name = ?");
    params.push(input.name);
  }
  if (input.slug != null) {
    updates.push("slug = ?");
    params.push(input.slug);
  }
  if (input.description !== undefined) {
    updates.push("description = ?");
    params.push(input.description ?? null);
  }
  if (input.basePrice != null) {
    updates.push("base_price = ?");
    params.push(input.basePrice);
  }
  if (input.imageUrl !== undefined) {
    updates.push("image_url = ?");
    params.push(input.imageUrl ?? null);
  }
  if (input.isActive != null) {
    updates.push("is_active = ?");
    params.push(input.isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(productId);
    await appDataSource.query(
      `UPDATE products SET ${updates.join(", ")}, updated_at = NOW() WHERE product_id = ?`,
      params,
    );
  }

  const product = await findAdminProductById(productId);
  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return product;
};

export const deleteAdminProduct = async (productId: number): Promise<boolean> => {
  await ensureDatabase();

  const result = (await appDataSource.query(
    "UPDATE products SET is_active = 0, updated_at = NOW() WHERE product_id = ?",
    [productId],
  )) as ResultSetHeader;

  return result.affectedRows > 0;
};

export interface CreateProductOrderInput {
  userId: number;
  product: ProductRecord;
  variant: ProductVariantRecord | null;
  quantity: number;
  addressId: number | null;
}

export const createProductOrder = async (input: CreateProductOrderInput): Promise<number> => {
  await ensureDatabase();

  const orderId = await getNextId("orders", "order_id");
  const orderItemId = await getNextId("order_items", "order_item_id");
  const unitPrice = Number(input.variant?.price ?? input.product.basePrice);
  const totalPrice = unitPrice * input.quantity;

  await appDataSource.transaction(async (manager) => {
    await manager.query(
      `
        INSERT INTO orders (
          order_id,
          user_id,
          address_id,
          status,
          total_amount,
          shipping_fee,
          discount_amount,
          payment_status,
          placed_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, 'pending', ?, 0, 0, 'unpaid', NOW(), NOW(), NOW())
      `,
      [orderId, input.userId, input.addressId, totalPrice],
    );

    await manager.query(
      `
        INSERT INTO order_items (
          order_item_id,
          order_id,
          product_id,
          product_variant_id,
          product_name,
          sku,
          quantity,
          unit_price,
          total_price,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        orderItemId,
        orderId,
        input.product.id,
        input.variant?.id ?? null,
        input.product.name,
        input.variant?.sku ?? null,
        input.quantity,
        unitPrice,
        totalPrice,
      ],
    );
  });

  return orderId;
};

export const addFavoriteProduct = async (userId: number, productId: number): Promise<void> => {
  await ensureFavoritesTable();

  await appDataSource.query(
    "INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)",
    [userId, productId],
  ) as ResultSetHeader;
};

export const removeFavoriteProduct = async (userId: number, productId: number): Promise<void> => {
  await ensureFavoritesTable();

  await appDataSource.query(
    "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
    [userId, productId],
  ) as ResultSetHeader;
};

export const findFavoriteProducts = async (userId: number): Promise<ProductRecord[]> => {
  await ensureFavoritesTable();

  return appDataSource.query(
    `
      ${productSelect}
      INNER JOIN favorites f ON f.product_id = p.product_id
      WHERE f.user_id = ? AND p.is_active = 1
      ORDER BY f.created_at DESC
    `,
    [userId],
  ) as Promise<ProductRecord[]>;
};
