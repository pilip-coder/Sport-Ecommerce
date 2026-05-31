import { Router } from "express";

import {
  createReviewByUser,
  deleteReviewByUser,
  getReview,
  listReviews,
  updateReviewByUser,
} from "../Controllers/review.controller";
import { requireAuth } from "../Core/guards";

const reviewRouter = Router();

reviewRouter.get("/", listReviews);
reviewRouter.get("/:id", getReview);
reviewRouter.post("/", requireAuth, createReviewByUser);
reviewRouter.patch("/:id", requireAuth, updateReviewByUser);
reviewRouter.delete("/:id", requireAuth, deleteReviewByUser);

export default reviewRouter;
