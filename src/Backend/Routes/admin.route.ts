import { Router } from "express";

import {
  deleteUser,
  getFinancialSummary,
  getOrders,
  getPayments,
  getUsers,
  updatePaymentStatus,
  updateUserStatus,
} from "../Controllers/admin.controller";

const adminRouter = Router();

adminRouter.get("/users", getUsers);
adminRouter.patch("/users/:userId/status", updateUserStatus);
adminRouter.delete("/users/:userId", deleteUser);

adminRouter.get("/financial/summary", getFinancialSummary);
adminRouter.get("/financial/orders", getOrders);
adminRouter.get("/financial/payments", getPayments);
adminRouter.patch("/financial/payments/:paymentId/status", updatePaymentStatus);

export default adminRouter;
