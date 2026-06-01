import { Router } from "express";

import { deleteUser, getCurrentUser, getUser, listUsers } from "../Controllers/user.controller";
import { requireAuth, requireRoles } from "../Core/guards";

const userRouter = Router();

userRouter.get("/", requireAuth, requireRoles("Admin"), listUsers);
userRouter.get("/me", requireAuth, getCurrentUser);
userRouter.get("/:id", requireAuth, getUser);
userRouter.delete("/:id", requireAuth, requireRoles("Admin"), deleteUser);

export default userRouter;
