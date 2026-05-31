import type { Express } from "express";

import reviewRouter from "../Routes/review.route";

export const registerReviewModule = (app: Express): void => {
  app.use("/api/reviews", reviewRouter);
};
