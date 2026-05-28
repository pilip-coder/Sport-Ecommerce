import { AppError } from "../Core/errors";
import { deleteUserById as repoDeleteUserById, listUsers as repoListUsers } from "../Repositories/user.repository";

export const listUsers = async () => {
    return repoListUsers();
};

export const deleteUserById = async (id: string) => {
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId <= 0) {
        throw new AppError("Invalid user id.", 400);
    }

    const deleted = await repoDeleteUserById(userId);
    if (!deleted) {
        throw new AppError("User not found.", 404);
    }
};

