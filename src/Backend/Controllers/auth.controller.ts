import { Request, Response } from "express";

import { asyncHandler } from "../Core/utils";
import type { LoginDto, RegisterDto } from "../dto/auth";
import { loginUser, registerUser } from "../Services/auth.service";

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
