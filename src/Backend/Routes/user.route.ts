import { Router } from "express";

import { requireAuth, requireRoles } from "../Core/guards";
import { listAllUsers, deleteUser } from "../Controllers/user.controller";

const userRouter = Router();

// Admin-only
userRouter.get("/", requireAuth, requireRoles("Admin"), listAllUsers);
userRouter.delete("/:id", requireAuth, requireRoles("Admin"), deleteUser);

export default userRouter;

