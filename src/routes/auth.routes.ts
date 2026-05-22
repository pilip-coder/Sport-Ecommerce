import { Router } from "express";

import { AuthController } from "../controllers/auth.controller";
import { requireAuth } from "../core/guards";
import { asyncHandler } from "../core/utils";

export const createAuthRouter = (authController: AuthController): Router => {
  const router = Router();

  router.post("/register", asyncHandler(authController.register));
  router.post("/login", asyncHandler(authController.login));
  router.get("/me", requireAuth, asyncHandler(authController.me));

  return router;
};
