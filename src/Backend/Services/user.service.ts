import { AppError } from "../Core/errors";
<<<<<<< HEAD
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

=======
import type { AuthUserResponse, UserEntity } from "../Models/user.model";
import { findUserById, findUsers } from "../Repositories/auth.repository";

const toUserResponse = (user: UserEntity): AuthUserResponse => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  roleName: user.roleName,
});

export const getUserById = async (id: number): Promise<AuthUserResponse> => {
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError("Invalid user id.", 400);
  }

  const user = await findUserById(id);
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  return toUserResponse(user);
};

export const getUsers = async (): Promise<AuthUserResponse[]> => {
  const users = await findUsers();
  return users.map(toUserResponse);
};
>>>>>>> 3cad4341d19d5e3e8923cbe311985e29d79aaa8c
