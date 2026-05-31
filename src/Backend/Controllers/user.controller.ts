import { Request, Response } from "express";

<<<<<<< HEAD
import { asyncHandler } from "../Core/utils";
import { deleteUserById, listUsers } from "../Services/user.service";

export const listAllUsers = asyncHandler(async (_req: Request, res: Response) => {
    const result = await listUsers();
    res.status(200).json({ items: result });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    await deleteUserById(String(req.params.id ?? ""));
    res.status(200).json({ message: "User deleted successfully." });
});

=======
import { AuthenticatedRequest } from "../Core/guards";
import { asyncHandler } from "../Core/utils";
import { getUserById, getUsers } from "../Services/user.service";

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
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
