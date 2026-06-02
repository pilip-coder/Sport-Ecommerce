import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import type { CartItemEntity, CartRow } from "../Models/cart.model";
import { ensureCommerceTables } from "./commerce.repository";

interface AddCartItemInput {
  userId: number;
  productId: number;
  productVariantId?: number | null;
  quantity: number;
}

const mapCartRowToEntity = (row: CartRow): CartItemEntity => {
  const unitPrice = Number(row.base_price) + Number(row.extra_price ?? 0);
  const quantity = Number(row.quantity);

  return {
    id: Number(row.cart_item_id),
    userId: Number(row.user_id),
    productId: Number(row.product_id),
    productVariantId: Number(row.product_variant_id),
    productName: row.product_name,
    productSlug: row.product_slug,
    productDescription: row.product_description,
    imageUrl: row.image_url,
    sku: row.sku,
    basePrice: Number(row.base_price),
    extraPrice: Number(row.extra_price ?? 0),
    unitPrice,
    quantity,
    totalPrice: unitPrice * quantity,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
};

const resolveCartVariant = async (
  productId: number,
  productVariantId?: number | null,
): Promise<{ productId: number; variantId: number }> => {
  const productRows = (await appDataSource.query(
    "SELECT product_id FROM products WHERE product_id = ? LIMIT 1",
    [productId],
  )) as Array<{ product_id: number }>;

  if (productRows.length === 0) {
    throw new AppError(`Product with id ${productId} not found.`, 404);
  }

  const variantRows = (await appDataSource.query(
    productVariantId
      ? "SELECT variant_id FROM product_variants WHERE variant_id = ? AND product_id = ? LIMIT 1"
      : "SELECT variant_id FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC LIMIT 1",
    productVariantId ? [productVariantId, productId] : [productId],
  )) as Array<{ variant_id: number }>;

  if (variantRows.length === 0) {
    throw new AppError(`Product ${productId} has no matching variant.`, 404);
  }

  return {
    productId: Number(productRows[0].product_id),
    variantId: Number(variantRows[0].variant_id),
  };
};

export const listCartItemsFromRepository = async (userId: number): Promise<CartItemEntity[]> => {
  await ensureCommerceTables();

  const rows = (await appDataSource.query(
    `
      SELECT
        ci.cart_item_id,
        ci.user_id,
        ci.product_id,
        ci.product_variant_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        p.product_name,
        p.slug AS product_slug,
        p.description AS product_description,
        p.image_url,
        p.base_price,
        pv.sku,
        COALESCE(pv.extra_price, 0) AS extra_price
      FROM cart_items ci
      INNER JOIN products p ON p.product_id = ci.product_id
      INNER JOIN product_variants pv ON pv.variant_id = ci.product_variant_id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC, ci.cart_item_id DESC
    `,
    [userId],
  )) as CartRow[];

  return rows.map(mapCartRowToEntity);
};

export const addCartItemToRepository = async (input: AddCartItemInput): Promise<void> => {
  await ensureCommerceTables();

  const resolved = await resolveCartVariant(input.productId, input.productVariantId);

  await appDataSource.query(
    `
      INSERT INTO cart_items (
        user_id,
        product_id,
        product_variant_id,
        quantity,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        quantity = quantity + VALUES(quantity),
        updated_at = NOW()
    `,
    [input.userId, resolved.productId, resolved.variantId, input.quantity],
  );
};

export const updateCartItemQuantityInRepository = async (
  userId: number,
  cartItemId: number,
  quantity: number,
): Promise<void> => {
  await ensureCommerceTables();

  if (quantity === 0) {
    await removeCartItemFromRepository(userId, cartItemId);
    return;
  }

  const result = await appDataSource.query(
    `
      UPDATE cart_items
      SET quantity = ?, updated_at = NOW()
      WHERE cart_item_id = ? AND user_id = ?
    `,
    [quantity, cartItemId, userId],
  );

  if ((result as { affectedRows?: number }).affectedRows === 0) {
    throw new AppError("Cart item not found.", 404);
  }
};

export const removeCartItemFromRepository = async (
  userId: number,
  cartItemId: number,
): Promise<void> => {
  await ensureCommerceTables();

  const result = await appDataSource.query(
    "DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?",
    [cartItemId, userId],
  );

  if ((result as { affectedRows?: number }).affectedRows === 0) {
    throw new AppError("Cart item not found.", 404);
  }
};

export const clearCartFromRepository = async (userId: number): Promise<void> => {
  await ensureCommerceTables();
  await appDataSource.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);
};
