import { Router } from "express";

<<<<<<< HEAD
import { requireAuth, requireRoles } from "../Core/guards";
import { listAllUsers, deleteUser } from "../Controllers/user.controller";

const userRouter = Router();

// Admin-only
userRouter.get("/", requireAuth, requireRoles("Admin"), listAllUsers);
userRouter.delete("/:id", requireAuth, requireRoles("Admin"), deleteUser);

export default userRouter;

=======
import { getCurrentUser, getUser, listUsers } from "../Controllers/user.controller";
import { requireAuth } from "../Core/guards";

const userRouter = Router();

userRouter.get("/", listUsers);
userRouter.get("/me", requireAuth, getCurrentUser);
userRouter.get("/:id", requireAuth, getUser);

export default userRouter;
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
