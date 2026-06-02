import { Router } from "express";

import {
  createPaymentByUser,
  getPayment,
  listPayments,
  updatePaymentStatusByAdmin,
} from "../Controllers/payment.controller";
import { requireAuth } from "../Core/guards";

const paymentRouter = Router();

paymentRouter.get("/", requireAuth, listPayments);
paymentRouter.post("/", requireAuth, createPaymentByUser);
paymentRouter.get("/:id", requireAuth, getPayment);
paymentRouter.patch("/:id/status", requireAuth, updatePaymentStatusByAdmin);

export default paymentRouter;
