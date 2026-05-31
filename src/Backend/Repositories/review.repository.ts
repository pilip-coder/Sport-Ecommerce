import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import type { ReviewDto } from "../dto/review";

let reviewsTableReady = false;
let reviewsTableInitPromise: Promise<void> | null = null;

export interface CreateReviewRepositoryInput {
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
}

export interface UpdateReviewRepositoryInput {
  rating?: number;
  comment?: string | null;
}

export interface ReviewListRepositoryFilter {
  productId?: number;
  userId?: number;
  page: number;
  limit: number;
}

export interface ReviewListResult {
  items: ReviewDto[];
  total: number;
  page: number;
  limit: number;
}

export const ensureReviewsTable = async (): Promise<void> => {
  if (reviewsTableReady || appDataSource.isInitialized) {
    reviewsTableReady = true;
    return;
  }

  if (!reviewsTableInitPromise) {
    reviewsTableInitPromise = (async () => {
      try {
        await appDataSource.initialize();
        reviewsTableReady = true;
      } catch (error) {
        const message = (error as { message?: string })?.message ?? String(error);
        throw new AppError(`Database unavailable: ${message}`, 503);
      }
    })().finally(() => {
      reviewsTableInitPromise = null;
    });
  }

  await reviewsTableInitPromise;
};

export const assertProductExists = async (productId: number): Promise<void> => {
  await ensureReviewsTable();

  const rows = (await appDataSource.query(
    "SELECT product_id FROM products WHERE product_id = ? LIMIT 1",
    [productId],
  )) as Array<{ product_id: number }>;

  if (rows.length === 0) {
    throw new AppError("Product not found.", 404);
  }
};

const getNextReviewId = async (): Promise<number> => {
  const rows = (await appDataSource.query(
    "SELECT COALESCE(MAX(review_id), 0) + 1 AS next_id FROM reviews",
  )) as Array<{ next_id: number | string }>;

  return Number(rows[0]?.next_id ?? 1);
};

export const createReviewInRepository = async (
  input: CreateReviewRepositoryInput,
): Promise<number> => {
  await ensureReviewsTable();

  const reviewId = await getNextReviewId();

  await appDataSource.query(
    `INSERT INTO reviews (review_id, user_id, product_id, rating, comment, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [reviewId, input.userId, input.productId, input.rating, input.comment],
  );

  return reviewId;
};

export const findReviewById = async (reviewId: number): Promise<ReviewDto | null> => {
  await ensureReviewsTable();

  const rows = (await appDataSource.query(
    `${reviewSelectSql()} WHERE r.review_id = ? LIMIT 1`,
    [reviewId],
  )) as Array<Record<string, unknown>>;

  return rows.length > 0 ? mapReview(rows[0]) : null;
};

export const listReviewsFromRepository = async (
  filter: ReviewListRepositoryFilter,
): Promise<ReviewListResult> => {
  await ensureReviewsTable();

  const whereParts: string[] = [];
  const params: Array<number> = [];

  if (filter.productId) {
    whereParts.push("r.product_id = ?");
    params.push(filter.productId);
  }

  if (filter.userId) {
    whereParts.push("r.user_id = ?");
    params.push(filter.userId);
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";
  const offset = (filter.page - 1) * filter.limit;

  const countRows = (await appDataSource.query(
    `SELECT COUNT(*) AS total FROM reviews r ${whereSql}`,
    params,
  )) as Array<{ total: number | string }>;

  const rows = (await appDataSource.query(
    `${reviewSelectSql()} ${whereSql} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, filter.limit, offset],
  )) as Array<Record<string, unknown>>;

  return {
    items: rows.map(mapReview),
    total: Number(countRows[0]?.total ?? 0),
    page: filter.page,
    limit: filter.limit,
  };
};

export const updateReviewInRepository = async (
  reviewId: number,
  input: UpdateReviewRepositoryInput,
): Promise<void> => {
  await ensureReviewsTable();

  const setParts: string[] = [];
  const params: Array<number | string | null> = [];

  if (input.rating !== undefined) {
    setParts.push("rating = ?");
    params.push(input.rating);
  }

  if (input.comment !== undefined) {
    setParts.push("comment = ?");
    params.push(input.comment);
  }

  if (setParts.length === 0) {
    return;
  }

  params.push(reviewId);

  const result = await appDataSource.query(
    `UPDATE reviews SET ${setParts.join(", ")} WHERE review_id = ?`,
    params,
  );

  if ((result as { affectedRows?: number }).affectedRows === 0) {
    throw new AppError("Review not found.", 404);
  }
};

export const deleteReviewInRepository = async (reviewId: number): Promise<void> => {
  await ensureReviewsTable();

  const result = await appDataSource.query(
    "DELETE FROM reviews WHERE review_id = ?",
    [reviewId],
  );

  if ((result as { affectedRows?: number }).affectedRows === 0) {
    throw new AppError("Review not found.", 404);
  }
};

const reviewSelectSql = (): string => `
  SELECT
    r.review_id,
    r.user_id,
    r.product_id,
    r.rating,
    r.comment,
    r.created_at,
    u.full_name AS user_name,
    p.product_name AS product_name
  FROM reviews r
  LEFT JOIN users u ON u.user_id = r.user_id
  LEFT JOIN products p ON p.product_id = r.product_id
`;

const mapReview = (row: Record<string, unknown>): ReviewDto => ({
  id: Number(row.review_id),
  userId: Number(row.user_id),
  productId: Number(row.product_id),
  rating: Number(row.rating),
  comment: row.comment != null ? String(row.comment) : null,
  createdAt: new Date(String(row.created_at)),
  userName: row.user_name != null ? String(row.user_name) : null,
  productName: row.product_name != null ? String(row.product_name) : null,
});
