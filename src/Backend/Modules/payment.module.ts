import type { Express } from "express";

import paymentRouter from "../Routes/payment.route";

export const registerPaymentModule = (app: Express): void => {
  app.use("/api/payments", paymentRouter);
};
