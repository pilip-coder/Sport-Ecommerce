import { AppError } from "../Core/errors";
import type { AuthUserResponse, UserEntity } from "../Models/user.model";
import { findUserById, findUsers } from "../Repositories/auth.repository";
import { deleteUserById as repoDeleteUserById } from "../Repositories/user.repository";

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

export const deleteUserById = async (id: string): Promise<void> => {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError("Invalid user id.", 400);
  }

  const deleted = await repoDeleteUserById(userId);
  if (!deleted) {
    throw new AppError("User not found.", 404);
  }
};
