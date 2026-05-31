import type { Express } from "express";

import userRouter from "../Routes/user.route";

export const registerUserModule = (app: Express): void => {
<<<<<<< HEAD
    app.use("/api/users", userRouter);
};

=======
  app.use("/api/users", userRouter);
};
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
