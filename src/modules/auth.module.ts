import { Router } from "express";

import { AuthController } from "../controllers/auth.controller";
import { AuthRepository } from "../repositories/auth.repository";
import { createAuthRouter } from "../routes/auth.routes";
import { AuthService } from "../services/auth.service";

export const createAuthModule = (): Router => {
  const authRepository = new AuthRepository();
  const authService = new AuthService(authRepository);
  const authController = new AuthController(authService);

  return createAuthRouter(authController);
};
