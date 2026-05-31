import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import { UserEntity } from "../Models/user.model";

let usersTableReady = false;
let usersTableInitPromise: Promise<void> | null = null;

export const ensureUsersTable = async (): Promise<void> => {
  if (usersTableReady || appDataSource.isInitialized) {
    usersTableReady = true;
    return;
  }

  if (!usersTableInitPromise) {
    usersTableInitPromise = (async () => {
      try {
        await appDataSource.initialize();
        usersTableReady = true;
      } catch (error) {
        const message = (error as { message?: string })?.message ?? String(error);
        throw new AppError(`Database unavailable: ${message}`, 503);
      }
    })().finally(() => {
      usersTableInitPromise = null;
    });
  }

  await usersTableInitPromise;
};


export const findUserByEmail = async (email: string): Promise<UserEntity | null> => {
  await ensureUsersTable();

  const userRepository = appDataSource.getRepository(UserEntity);
  const user = await userRepository.findOne({ where: { email } });
  return user ?? null;
};

export const findUserById = async (id: number): Promise<UserEntity | null> => {
  await ensureUsersTable();

  const userRepository = appDataSource.getRepository(UserEntity);
  const user = await userRepository.findOne({ where: { id } });
  return user ?? null;
};

export const findUsers = async (): Promise<UserEntity[]> => {
  await ensureUsersTable();

  const userRepository = appDataSource.getRepository(UserEntity);
  return await userRepository.find({ order: { id: "ASC" } });
};

export interface CreateUserInput {
  email: string;
  fullName: string;
  passwordHash: string;
  phone: string | null;
  roleName: string;
}

const getNextUserId = async (): Promise<number> => {
  const rows = (await appDataSource.query(
    "SELECT COALESCE(MAX(user_id), 0) + 1 AS next_id FROM users",
  )) as Array<{ next_id: number }>;

  return Number(rows[0]?.next_id ?? 1);
};

const resolveRoleId = async (roleName: string): Promise<number | null> => {
  const normalizedRoleName = roleName.trim().toLowerCase();

  const exactRows = (await appDataSource.query(
    "SELECT role_id FROM roles WHERE LOWER(role_name) = ? LIMIT 1",
    [normalizedRoleName],
  )) as Array<{ role_id: number }>;

  if (exactRows.length > 0) {
    return Number(exactRows[0].role_id);
  }

  const customerRows = (await appDataSource.query(
    "SELECT role_id FROM roles WHERE LOWER(role_name) = 'customer' LIMIT 1",
  )) as Array<{ role_id: number }>;

  if (customerRows.length > 0) {
    return Number(customerRows[0].role_id);
  }

  return null;
};

const countAdminUsers = async (): Promise<number> => {
  const rows = (await appDataSource.query(
    "SELECT COUNT(*) AS total FROM users WHERE role_id = 1",
  )) as Array<{ total: number }>;

  return Number(rows[0]?.total ?? 0);
};

export const createUser = async (input: CreateUserInput): Promise<UserEntity> => {
  await ensureUsersTable();

  const normalizedRoleName = input.roleName.trim().toLowerCase();
  if (normalizedRoleName === "admin") {
    const existingAdmins = await countAdminUsers();
    if (existingAdmins > 0) {
      throw new AppError("Admin account already exists.", 409);
    }
  }

  const userRepository = appDataSource.getRepository(UserEntity);
  const [nextUserId, roleId] = await Promise.all([getNextUserId(), resolveRoleId(input.roleName)]);

  const user = userRepository.create({
    id: nextUserId,
    roleId,
    email: input.email,
    fullName: input.fullName,
    passwordHash: input.passwordHash,
    phone: input.phone,
  });

  try {
    return await userRepository.save(user);
  } catch (error) {
    const errorCode = (error as { code?: string; driverError?: { code?: string } }).code
      ?? (error as { driverError?: { code?: string } }).driverError?.code;

    if (errorCode === "ER_DUP_ENTRY") {
      throw new AppError("Email is already registered.", 409);
    }
    throw error;
  }
};
