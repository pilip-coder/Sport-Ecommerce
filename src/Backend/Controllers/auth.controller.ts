import { Request, Response } from "express";

import { AppError } from "../Core/errors";
import { type AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import type { LoginDto, RegisterDto } from "../dto/auth";
import { loginUser, logoutUser, registerUser } from "../Services/auth.service";

export const register = asyncHandler<never, unknown, RegisterDto>(async (req: Request<never, unknown, RegisterDto>, res: Response) => {
  const result = await registerUser(req.body);
  res.status(201).json({
    message: "User registered successfully.",
    ...result,
  });
});

export const login = asyncHandler<never, unknown, LoginDto>(async (req: Request<never, unknown, LoginDto>, res: Response) => {
  const result = await loginUser(req.body);
  res.status(200).json({
    message: "Login successful.",
    ...result,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const authUser = (req as AuthenticatedRequest).authUser;
  if (!authUser?.sessionId) {
    throw new AppError("Unauthorized.", 401);
  }

  await logoutUser(authUser.userId, authUser.sessionId);
  res.status(200).json({
    message: "Logout successful.",
  });
});
