import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import type { CartItemEntity } from "../Models/cart-item.model";
import type { CartEntity } from "../Models/cart.model";

let cartsTableReady = false;
let cartsTableInitPromise: Promise<void> | null = null;

export const ensureCartsTable = async (): Promise<void> => {
  if (cartsTableReady || appDataSource.isInitialized) {
    cartsTableReady = true;
    return;
  }

  if (!cartsTableInitPromise) {
    cartsTableInitPromise = (async () => {
      try {
        await appDataSource.initialize();
        cartsTableReady = true;
      } catch (error) {
        const message = (error as { message?: string })?.message ?? String(error);
        throw new AppError(`Database unavailable: ${message}`, 503);
      }
    })().finally(() => {
      cartsTableInitPromise = null;
    });
  }

  await cartsTableInitPromise;
};

export const findFirstUserId = async (): Promise<number | null> => {
  await ensureCartsTable();

  const rows = (await appDataSource.query(
    "SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1",
  )) as Array<{ user_id: number }>;

  return rows.length > 0 ? Number(rows[0].user_id) : null;
};

export const findOrCreateCart = async (userId: number): Promise<CartEntity> => {
  await ensureCartsTable();

  const existingRows = (await appDataSource.query(
    "SELECT cart_id, user_id, created_at FROM carts WHERE user_id = ? LIMIT 1",
    [userId],
  )) as Array<Record<string, unknown>>;

  if (existingRows.length > 0) {
    return mapRowToCart(existingRows[0]);
  }

  const result = (await appDataSource.query(
    "INSERT INTO carts (user_id, created_at) VALUES (?, NOW())",
    [userId],
  )) as { insertId?: number };

  return {
    id: Number(result.insertId),
    userId,
    createdAt: new Date(),
  };
};

export const findCartByUserId = async (userId: number): Promise<CartEntity | null> => {
  await ensureCartsTable();

  const rows = (await appDataSource.query(
    "SELECT cart_id, user_id, created_at FROM carts WHERE user_id = ? LIMIT 1",
    [userId],
  )) as Array<Record<string, unknown>>;

  return rows.length > 0 ? mapRowToCart(rows[0]) : null;
};

export const findVariantByInput = async (
  input: { productVariantId?: number; variantId?: number; productId?: number },
): Promise<{ variantId: number } | null> => {
  await ensureCartsTable();

  const requestedVariantId = input.productVariantId ?? input.variantId;

  const rows = (await appDataSource.query(
    requestedVariantId
      ? "SELECT variant_id FROM product_variants WHERE variant_id = ? LIMIT 1"
      : "SELECT variant_id FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC LIMIT 1",
    requestedVariantId ? [requestedVariantId] : [input.productId],
  )) as Array<{ variant_id: number }>;

  return rows.length > 0 ? { variantId: Number(rows[0].variant_id) } : null;
};

export const upsertCartItem = async (
  cartId: number,
  variantId: number,
  quantity: number,
): Promise<CartItemEntity> => {
  await ensureCartsTable();

  const existingRows = (await appDataSource.query(
    "SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND variant_id = ? LIMIT 1",
    [cartId, variantId],
  )) as Array<{ cart_item_id: number; quantity: number }>;

  if (existingRows.length > 0) {
    const newQuantity = Number(existingRows[0].quantity) + quantity;
    await appDataSource.query(
      "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
      [newQuantity, existingRows[0].cart_item_id],
    );

    const item = await findCartItemById(Number(existingRows[0].cart_item_id));
    if (!item) {
      throw new AppError("Cart item not found after update.", 500);
    }
    return item;
  }

  const result = (await appDataSource.query(
    "INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)",
    [cartId, variantId, quantity],
  )) as { insertId?: number };

  const item = await findCartItemById(Number(result.insertId));
  if (!item) {
    throw new AppError("Cart item not found after create.", 500);
  }

  return item;
};

export const findCartItems = async (cartId: number): Promise<CartItemEntity[]> => {
  await ensureCartsTable();

  const rows = (await appDataSource.query(
    `${cartItemSelectSql()} WHERE ci.cart_id = ? ORDER BY ci.cart_item_id ASC`,
    [cartId],
  )) as Array<Record<string, unknown>>;

  return rows.map(mapRowToCartItem);
};

export const findCartItemById = async (cartItemId: number): Promise<CartItemEntity | null> => {
  await ensureCartsTable();

  const rows = (await appDataSource.query(
    `${cartItemSelectSql()} WHERE ci.cart_item_id = ? LIMIT 1`,
    [cartItemId],
  )) as Array<Record<string, unknown>>;

  return rows.length > 0 ? mapRowToCartItem(rows[0]) : null;
};

export const updateCartItemQuantity = async (
  cartItemId: number,
  quantity: number,
): Promise<CartItemEntity | null> => {
  await ensureCartsTable();

  const result = await appDataSource.query(
    "UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?",
    [quantity, cartItemId],
  );

  if ((result as { affectedRows?: number }).affectedRows === 0) {
    return null;
  }

  return findCartItemById(cartItemId);
};

export const deleteCartItem = async (cartItemId: number): Promise<boolean> => {
  await ensureCartsTable();

  const result = await appDataSource.query(
    "DELETE FROM cart_items WHERE cart_item_id = ?",
    [cartItemId],
  );

  return (result as { affectedRows?: number }).affectedRows !== 0;
};

export const clearCartItems = async (cartId: number): Promise<void> => {
  await ensureCartsTable();
  await appDataSource.query("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);
};

const cartItemSelectSql = (): string => `
  SELECT
    ci.cart_item_id,
    ci.cart_id,
    ci.variant_id,
    ci.quantity,
    pv.product_id,
    pv.sku,
    pv.extra_price,
    p.product_name,
    p.base_price
  FROM cart_items ci
  LEFT JOIN product_variants pv ON pv.variant_id = ci.variant_id
  LEFT JOIN products p ON p.product_id = pv.product_id
`;

const mapRowToCart = (row: Record<string, unknown>): CartEntity => ({
  id: Number(row.cart_id),
  userId: Number(row.user_id),
  createdAt: new Date(String(row.created_at)),
});

const mapRowToCartItem = (row: Record<string, unknown>): CartItemEntity => {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.base_price) + Number(row.extra_price ?? 0);

  return {
    id: Number(row.cart_item_id),
    cartId: Number(row.cart_id),
    productId: Number(row.product_id),
    productVariantId: Number(row.variant_id),
    productName: String(row.product_name ?? ""),
    sku: row.sku != null ? String(row.sku) : null,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
  };
};
