import { appDataSource } from "../Config/database.config";
import { environment } from "../Config/environment";
import { AppError } from "../Core/errors";
import type { OrderItemEntity } from "../Models/order-item.model";
import type { OrderEntity } from "../Models/order.model";
import { reserveVariantStock } from "./inventory.repository";

let ordersTableReady = false;
let ordersTableInitPromise: Promise<void> | null = null;

interface StockBootstrapSchema {
  tableName: string;
  variantIdColumn: string;
}

export const ensureOrdersTable = async (): Promise<void> => {
  if (ordersTableReady || appDataSource.isInitialized) {
    ordersTableReady = true;
    return;
  }

  if (!ordersTableInitPromise) {
    ordersTableInitPromise = (async () => {
      try {
        await appDataSource.initialize();
        ordersTableReady = true;
      } catch (error) {
        const message = (error as { message?: string })?.message ?? String(error);
        throw new AppError(`Database unavailable: ${message}`, 503);
      }
    })().finally(() => {
      ordersTableInitPromise = null;
    });
  }

  await ordersTableInitPromise;
};

export const findFirstUserId = async (): Promise<number | null> => {
  await ensureOrdersTable();

  const rows = (await appDataSource.query(
    "SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1",
  )) as Array<{ user_id: number }>;

  return rows.length > 0 ? Number(rows[0].user_id) : null;
};

export const seedPostmanCatalog = async (): Promise<void> => {
  await ensureOrdersTable();

  const productRows = (await appDataSource.query(
    "SELECT product_id FROM products WHERE product_id IN (1, 2)",
  )) as Array<{ product_id: number }>;
  const existingProductIds = new Set(productRows.map((row) => Number(row.product_id)));

  if (!existingProductIds.has(1)) {
    await appDataSource.query(
      `INSERT INTO products (product_id, category_id, product_name, description, base_price, image_url, status)
       VALUES (1, NULL, 'Postman Training Shirt', 'Sample product for API testing', 19.99, NULL, 'available')`,
    );
    existingProductIds.add(1);
  }

  if (!existingProductIds.has(2)) {
    await appDataSource.query(
      `INSERT INTO products (product_id, category_id, product_name, description, base_price, image_url, status)
       VALUES (2, NULL, 'Postman Running Shoes', 'Sample product for API testing', 49.99, NULL, 'available')`,
    );
    existingProductIds.add(2);
  }

  const product1VariantRows = (await appDataSource.query(
    "SELECT variant_id FROM product_variants WHERE product_id = 1 ORDER BY variant_id ASC LIMIT 1",
  )) as Array<{ variant_id: number }>;
  const product2VariantRows = (await appDataSource.query(
    "SELECT variant_id FROM product_variants WHERE product_id = 2 ORDER BY variant_id ASC LIMIT 1",
  )) as Array<{ variant_id: number }>;
  let nextVariantId = Number(
    (
      (await appDataSource.query(
        "SELECT COALESCE(MAX(variant_id), 0) + 1 AS next_id FROM product_variants",
      )) as Array<{ next_id: number }>
    )[0]?.next_id ?? 1,
  );

  if (existingProductIds.has(1) && product1VariantRows.length === 0) {
    await appDataSource.query(
      `INSERT INTO product_variants (variant_id, product_id, size, color, sku, extra_price)
       VALUES (?, 1, 'M', 'Black', 'POSTMAN-SHIRT-M-BLK', 0.00)`,
      [nextVariantId],
    );
    nextVariantId += 1;
  }

  if (existingProductIds.has(2) && product2VariantRows.length === 0) {
    await appDataSource.query(
      `INSERT INTO product_variants (variant_id, product_id, size, color, sku, extra_price)
       VALUES (?, 2, '42', 'White', 'POSTMAN-SHOE-42-WHT', 10.00)`,
      [nextVariantId],
    );
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

  const stockSchema = await resolveStockBootstrapSchema();
  if (!stockSchema) {
    return;
  }

  const demoVariants = (await appDataSource.query(
    "SELECT variant_id FROM product_variants WHERE product_id IN (1, 2) ORDER BY variant_id ASC",
  )) as Array<{ variant_id: number }>;
  const demoVariantIds = demoVariants.map((row) => Number(row.variant_id));

  if (demoVariantIds.length > 0) {
    const placeholders = demoVariantIds.map(() => "?").join(", ");
    const existingStockRows = (await appDataSource.query(
      `SELECT ${stockSchema.variantIdColumn} FROM ${stockSchema.tableName} WHERE ${stockSchema.variantIdColumn} IN (${placeholders})`,
      demoVariantIds,
    )) as Array<Record<string, unknown>>;
    const existingStockIds = new Set(
      existingStockRows.map((row) => Number(row[stockSchema.variantIdColumn])),
    );

    for (const variantId of demoVariantIds) {
      if (existingStockIds.has(variantId)) {
        continue;
      }

      await appDataSource.query(
        `INSERT INTO ${stockSchema.tableName} (${stockSchema.variantIdColumn}, quantity, reserved_quantity, warehouse_location, created_at, updated_at)
         VALUES (?, 1, 0, NULL, NOW(), NOW())`,
        [variantId],
      );
    }
  }
};

const resolveStockBootstrapSchema = async (): Promise<StockBootstrapSchema | null> => {
  const rows = (await appDataSource.query(
    `
      SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN ('stock', 'stocks')
    `,
    [environment.databaseName],
  )) as Array<{ table_name: string; column_name: string }>;

  if (rows.length === 0) {
    return null;
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
    return null;
  }

  const variantIdColumn = columns.has("variant_id")
    ? "variant_id"
    : columns.has("product_variant_id")
      ? "product_variant_id"
      : null;

  if (!variantIdColumn) {
    return null;
  }

  return {
    tableName,
    variantIdColumn,
  };
};

export const createOrder = async (
  order: Omit<OrderEntity, "createdAt" | "updatedAt">,
  items: Array<Omit<OrderItemEntity, "id" | "orderId" | "createdAt" | "updatedAt">>,
): Promise<OrderEntity> => {
  await ensureOrdersTable();

  const queryRunner = appDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    for (const item of items) {
      if (item.productVariantId == null) {
        throw new AppError("Product variant is required for order items.", 400);
      }

      await reserveVariantStock(queryRunner, item.productId, item.productVariantId, item.quantity);
    }

    const insertResult = (await queryRunner.query(
      `INSERT INTO orders (user_id, address_id, total_amount, order_status, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [order.userId, order.addressId, order.totalAmount, order.status],
    )) as { insertId?: number };
    const orderId = Number(insertResult.insertId);

    if (!orderId) {
      throw new AppError("Failed to create order.", 500);
    }

    for (const item of items) {
      await queryRunner.query(
        `INSERT INTO order_items (order_id, variant_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.productVariantId, item.quantity, item.totalPrice],
      );
    }

    await queryRunner.commitTransaction();

    return {
      ...order,
      id: orderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

export interface OrderWithItems {
  order: OrderEntity;
  items: OrderItemEntity[];
}

export const findOrderById = async (orderId: number): Promise<OrderWithItems | null> => {
  await ensureOrdersTable();

  const orderRows = (await appDataSource.query(
    `${orderSelectSql()} WHERE o.order_id = ? LIMIT 1`,
    [orderId],
  )) as Array<Record<string, unknown>>;

  if (orderRows.length === 0) {
    return null;
  }

  const itemRows = (await appDataSource.query(
    itemSelectSql("WHERE oi.order_id = ?"),
    [orderId],
  )) as Array<Record<string, unknown>>;

  return {
    order: mapRowToOrder(orderRows[0]),
    items: itemRows.map(mapRowToOrderItem),
  };
};

export const findAllOrders = async (
  page: number,
  limit: number,
  status?: string,
): Promise<{ orders: OrderEntity[]; total: number }> => {
  await ensureOrdersTable();

  const offset = (page - 1) * limit;
  let countQuery = "SELECT COUNT(*) AS total FROM orders o";
  let query = orderSelectSql();
  const params: unknown[] = [];

  if (status) {
    const filter = " WHERE o.order_status = ?";
    countQuery += filter;
    query += filter;
    params.push(status);
  }

  query += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?";

  const countRows = (await appDataSource.query(countQuery, params)) as Array<{ total: number }>;
  const rows = (await appDataSource.query(query, [...params, limit, offset])) as Array<Record<string, unknown>>;

  return {
    orders: rows.map(mapRowToOrder),
    total: Number(countRows[0]?.total ?? 0),
  };
};

export const findItemsByOrderId = async (orderId: number): Promise<OrderItemEntity[]> => {
  await ensureOrdersTable();

  const rows = (await appDataSource.query(
    itemSelectSql("WHERE oi.order_id = ?"),
    [orderId],
  )) as Array<Record<string, unknown>>;

  return rows.map(mapRowToOrderItem);
};

export const updateOrderStatus = async (orderId: number, status: string): Promise<void> => {
  await ensureOrdersTable();

  const result = await appDataSource.query(
    "UPDATE orders SET order_status = ? WHERE order_id = ?",
    [status, orderId],
  );

  if ((result as { affectedRows?: number }).affectedRows === 0) {
    throw new AppError("Order not found.", 404);
  }
};

const orderSelectSql = (): string => `
  SELECT
    o.order_id,
    o.user_id,
    o.address_id,
    o.total_amount,
    o.order_status,
    o.created_at,
    u.full_name,
    u.phone,
    a.street,
    a.city,
    a.province
  FROM orders o
  LEFT JOIN users u ON u.user_id = o.user_id
  LEFT JOIN addresses a ON a.address_id = o.address_id
`;

const itemSelectSql = (whereClause: string): string => `
  SELECT
    oi.order_item_id,
    oi.order_id,
    oi.variant_id,
    oi.quantity,
    oi.price,
    pv.product_id,
    pv.sku,
    p.product_name
  FROM order_items oi
  LEFT JOIN product_variants pv ON pv.variant_id = oi.variant_id
  LEFT JOIN products p ON p.product_id = pv.product_id
  ${whereClause}
`;

const formatAddress = (row: Record<string, unknown>): string => {
  return [row.street, row.city, row.province]
    .filter((value) => value != null && String(value).trim().length > 0)
    .map(String)
    .join(", ");
};

const mapRowToOrder = (row: Record<string, unknown>): OrderEntity => ({
  id: Number(row.order_id),
  userId: Number(row.user_id),
  addressId: row.address_id != null ? Number(row.address_id) : null,
  customerName: String(row.full_name ?? ""),
  address: formatAddress(row),
  phone: String(row.phone ?? ""),
  status: String(row.order_status),
  totalAmount: Number(row.total_amount),
  orderDate: row.created_at != null ? new Date(String(row.created_at)) : null,
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.created_at)),
});

const mapRowToOrderItem = (row: Record<string, unknown>): OrderItemEntity => {
  const totalPrice = Number(row.price);
  const quantity = Number(row.quantity);

  return {
    id: Number(row.order_item_id),
    orderId: Number(row.order_id),
    productId: Number(row.product_id),
    productVariantId: Number(row.variant_id),
    productName: String(row.product_name ?? ""),
    sku: row.sku != null ? String(row.sku) : null,
    quantity,
    unitPrice: quantity > 0 ? totalPrice / quantity : totalPrice,
    totalPrice,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
