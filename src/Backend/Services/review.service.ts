import { AppError } from "../Core/errors";
import type { CreateReviewDto, ReviewListQueryDto, UpdateReviewDto } from "../dto/review";
import {
  assertProductExists,
  createReviewInRepository,
  deleteReviewInRepository,
  findReviewById,
  listReviewsFromRepository,
  updateReviewInRepository,
} from "../Repositories/review.repository";

const toPositiveInt = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }
  return parsed;
};

const toOptionalPositiveInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const toPageValue = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeRating = (value: unknown): number => {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError("rating must be an integer from 1 to 5.", 400);
  }
  return rating;
};

const normalizeComment = (value: string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }

  const comment = value.trim();
  return comment.length > 0 ? comment : null;
};

const canMutateReview = (reviewUserId: number, userId: number, role: string): boolean => {
  const normalizedRole = role.trim().toLowerCase();
  return reviewUserId === userId || normalizedRole === "admin" || normalizedRole === "staff";
};

export const getReviewList = async (query: ReviewListQueryDto) => {
  return listReviewsFromRepository({
    productId: toOptionalPositiveInt(query.productId),
    userId: toOptionalPositiveInt(query.userId),
    page: toPageValue(query.page, 1),
    limit: Math.min(toPageValue(query.limit, 10), 50),
  });
};

export const getReviewDetail = async (reviewIdParam: string) => {
  const reviewId = toPositiveInt(reviewIdParam, "Review ID");
  const review = await findReviewById(reviewId);

  if (!review) {
    throw new AppError("Review not found.", 404);
  }

  return review;
};

export const createReview = async (userId: number, payload: CreateReviewDto) => {
  const productId = toPositiveInt(payload.productId, "productId");
  const rating = normalizeRating(payload.rating);
  const comment = normalizeComment(payload.comment);

  await assertProductExists(productId);

  const reviewId = await createReviewInRepository({
    userId,
    productId,
    rating,
    comment,
  });

  return getReviewDetail(String(reviewId));
};

export const updateReview = async (
  reviewIdParam: string,
  userId: number,
  role: string,
  payload: UpdateReviewDto,
) => {
  const review = await getReviewDetail(reviewIdParam);
  if (!canMutateReview(review.userId, userId, role)) {
    throw new AppError("Forbidden. You can only update your own review.", 403);
  }

  const updateInput: UpdateReviewDto = {};

  if (payload.rating !== undefined) {
    updateInput.rating = normalizeRating(payload.rating);
  }

  if (payload.comment !== undefined) {
    updateInput.comment = normalizeComment(payload.comment);
  }

  if (Object.keys(updateInput).length === 0) {
    throw new AppError("No updatable fields were provided.", 400);
  }

  await updateReviewInRepository(review.id, updateInput);
  return getReviewDetail(String(review.id));
};

export const deleteReview = async (
  reviewIdParam: string,
  userId: number,
  role: string,
): Promise<void> => {
  const review = await getReviewDetail(reviewIdParam);
  if (!canMutateReview(review.userId, userId, role)) {
    throw new AppError("Forbidden. You can only delete your own review.", 403);
  }

  await deleteReviewInRepository(review.id);
};
