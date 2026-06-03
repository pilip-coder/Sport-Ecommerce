import { Router } from "express";

import { getCurrentUser, getUser, listUsers } from "../Controllers/user.controller";
import { requireAuth } from "../Core/guards";

const userRouter = Router();

userRouter.get("/", listUsers);
userRouter.get("/me", requireAuth, getCurrentUser);
userRouter.get("/:id", requireAuth, getUser);

export default userRouter;
