import { Router } from "express";

import { login, logout, register } from "../Controllers/auth.controller";
import { requireAuth } from "../Core/guards";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", requireAuth, logout);

export default authRouter;
