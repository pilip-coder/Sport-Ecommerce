import { Router } from "express";

import { PaymentController } from "../controllers/payment.controller";
import { PaymentRepository } from "../repositories/payment.repository";
import { createPaymentRouter } from "../routes/payment.routes";
import { PaymentService } from "../services/payment.service";

export const createPaymentModule = (): Router => {
  const paymentRepository = new PaymentRepository();
  const paymentService = new PaymentService(paymentRepository);
  const paymentController = new PaymentController(paymentService);

  return createPaymentRouter(paymentController);
};
