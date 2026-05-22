import { Router } from "express";

import { PaymentController } from "../controllers/payment.controller";
import { asyncHandler } from "../core/utils";

export const createPaymentRouter = (paymentController: PaymentController): Router => {
  const router = Router();

  router.post("/", asyncHandler(paymentController.create));
  router.get("/:reference", asyncHandler(paymentController.verify));

  return router;
};
