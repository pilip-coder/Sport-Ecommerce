import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import type { WishlistItemEntity, WishlistRow } from "../Models/wishlist.model";
import { ensureCommerceTables } from "./commerce.repository";

const mapWishlistRowToEntity = (row: WishlistRow): WishlistItemEntity => ({
  id: Number(row.wishlist_item_id),
  userId: Number(row.user_id),
  productId: Number(row.product_id),
  productName: row.product_name,
  productSlug: row.product_slug,
  productDescription: row.product_description,
  imageUrl: row.image_url,
  basePrice: Number(row.base_price),
  createdAt: new Date(String(row.created_at)),
  updatedAt: new Date(String(row.updated_at)),
});

const assertProductExists = async (productId: number): Promise<void> => {
  const rows = (await appDataSource.query(
    "SELECT product_id FROM products WHERE product_id = ? LIMIT 1",
    [productId],
  )) as Array<{ product_id: number }>;

  if (rows.length === 0) {
    throw new AppError(`Product with id ${productId} not found.`, 404);
  }
};

export const listWishlistItemsFromRepository = async (userId: number): Promise<WishlistItemEntity[]> => {
  await ensureCommerceTables();

  const rows = (await appDataSource.query(
    `
      SELECT
        wi.wishlist_item_id,
        wi.user_id,
        wi.product_id,
        wi.created_at,
        wi.updated_at,
        p.product_name,
        p.slug AS product_slug,
        p.description AS product_description,
        p.image_url,
        p.base_price
      FROM wishlist_items wi
      INNER JOIN products p ON p.product_id = wi.product_id
      WHERE wi.user_id = ?
      ORDER BY wi.created_at DESC, wi.wishlist_item_id DESC
    `,
    [userId],
  )) as WishlistRow[];

  return rows.map(mapWishlistRowToEntity);
};

export const addWishlistItemToRepository = async (userId: number, productId: number): Promise<void> => {
  await ensureCommerceTables();
  await assertProductExists(productId);

  await appDataSource.query(
    `
      INSERT INTO wishlist_items (
        user_id,
        product_id,
        created_at,
        updated_at
      ) VALUES (?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE updated_at = NOW()
    `,
    [userId, productId],
  );
};

export const removeWishlistItemFromRepository = async (
  userId: number,
  productId: number,
): Promise<void> => {
  await ensureCommerceTables();

  const result = await appDataSource.query(
    "DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?",
    [userId, productId],
  );

  if ((result as { affectedRows?: number }).affectedRows === 0) {
    throw new AppError("Wishlist item not found.", 404);
  }
};
