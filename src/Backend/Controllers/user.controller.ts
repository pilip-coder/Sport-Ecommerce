import { Request, Response } from "express";

import { AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import { deleteUserById, getUserById, getUsers } from "../Services/user.service";

export const listUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const users = await getUsers();
    res.status(200).json({ items: users });
  },
);

export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    const authUser = (req as AuthenticatedRequest).authUser;
    const user = await getUserById(Number(authUser?.userId));
    res.status(200).json({ user });
  },
);

export const getUser = asyncHandler<{ id: string }>(
  async (req: Request<{ id: string }>, res: Response) => {
    const user = await getUserById(Number(req.params.id));
    res.status(200).json({ user });
  },
);

export const deleteUser = asyncHandler<{ id: string }>(
  async (req: Request<{ id: string }>, res: Response) => {
    await deleteUserById(req.params.id);
    res.status(200).json({ message: "User deleted successfully." });
  },
);
