import { Request, Response } from "express";

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

