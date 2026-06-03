import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import { UserEntity } from "../Models/user.model";

let usersDbReady = false;
let usersDbInitPromise: Promise<void> | null = null;

const ensureUsersDatabase = async (): Promise<void> => {
    if (usersDbReady || appDataSource.isInitialized) {
        usersDbReady = true;
        return;
    }

    if (!usersDbInitPromise) {
        usersDbInitPromise = (async () => {
            try {
                await appDataSource.initialize();
                usersDbReady = true;
            } catch (error) {
                const message = (error as { message?: string })?.message ?? String(error);
                throw new AppError(`Database unavailable: ${message}`, 503);
            }
        })().finally(() => {
            usersDbInitPromise = null;
        });
    }

    await usersDbInitPromise;
};

export type UserListItem = {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    roleName: string;
};

export const listUsers = async (): Promise<UserListItem[]> => {
    await ensureUsersDatabase();
    const userRepository = appDataSource.getRepository(UserEntity);
    const users = await userRepository.find();
    return users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: u.phone,
        roleName: u.roleName,
    }));
};

export const deleteUserById = async (id: number): Promise<boolean> => {
    await ensureUsersDatabase();
    const userRepository = appDataSource.getRepository(UserEntity);
    const result = await userRepository.delete({ id });
    return (result.affected ?? 0) > 0;
};

