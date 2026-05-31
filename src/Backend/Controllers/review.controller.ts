import { Request, Response } from "express";

import { AppError } from "../Core/errors";
import { AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import type { CreateReviewDto, ReviewListQueryDto, UpdateReviewDto } from "../dto/review";
import {
  createReview,
  deleteReview,
  getReviewDetail,
  getReviewList,
  updateReview,
} from "../Services/review.service";

const getAuthUser = (req: Request) => {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (!authUser) {
    throw new AppError("Authorization header is required.", 401);
  }
  return authUser;
};

export const listReviews = asyncHandler<never, unknown, never, ReviewListQueryDto>(
  async (req: Request<never, unknown, never, ReviewListQueryDto>, res: Response) => {
    const result = await getReviewList(req.query);
    res.status(200).json(result);
  },
);

export const getReview = asyncHandler<{ id: string }>(
  async (req: Request<{ id: string }>, res: Response) => {
    const item = await getReviewDetail(req.params.id);
    res.status(200).json({ item });
  },
);

export const createReviewByUser = asyncHandler<never, unknown, CreateReviewDto>(
  async (req: Request<never, unknown, CreateReviewDto>, res: Response) => {
    const authUser = getAuthUser(req);
    const item = await createReview(authUser.userId, req.body);

    res.status(201).json({
      message: "Review created successfully.",
      item,
    });
  },
);

export const updateReviewByUser = asyncHandler<{ id: string }, unknown, UpdateReviewDto>(
  async (req: Request<{ id: string }, unknown, UpdateReviewDto>, res: Response) => {
    const authUser = getAuthUser(req);
    const item = await updateReview(req.params.id, authUser.userId, authUser.role, req.body);

    res.status(200).json({
      message: "Review updated successfully.",
      item,
    });
  },
);

export const deleteReviewByUser = asyncHandler<{ id: string }>(
  async (req: Request<{ id: string }>, res: Response) => {
    const authUser = getAuthUser(req);
    await deleteReview(req.params.id, authUser.userId, authUser.role);

    res.status(200).json({
      message: "Review deleted successfully.",
    });
  },
);
