import type { Express } from "express";

import userRouter from "../Routes/user.route";

export const registerUserModule = (app: Express): void => {
    app.use("/api/users", userRouter);
};

