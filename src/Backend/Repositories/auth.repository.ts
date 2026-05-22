import type { ResultSetHeader } from "mysql2/promise";

import { executeQuery } from "../Config/database.config";


import { AppError } from "../Core/errors";
import type { UserEntity, UserRow } from "../Models/user.model";

const mapUserRowToEntity = (row: UserRow): UserEntity => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  passwordHash: row.password_hash,
  phone: row.phone,
  roleName: row.role_name,
  createdAt: row.created_at,
});

let usersTableReady = false;
let usersTableInitPromise: Promise<void> | null = null;

export const ensureUsersTable = async (): Promise<void> => {
  if (usersTableReady) {
    return;
  }

  if (!usersTableInitPromise) {
    usersTableInitPromise = (async () => {
      await executeQuery<ResultSetHeader>(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(191) NOT NULL UNIQUE,
          full_name VARCHAR(120) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(30) NULL,
          role_name VARCHAR(40) NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      usersTableReady = true;
    })().finally(() => {
      usersTableInitPromise = null;
    });
  }

  await usersTableInitPromise;
};

export const findUserByEmail = async (email: string): Promise<UserEntity | null> => {
  await ensureUsersTable();

  const rows = await executeQuery<UserRow[]>(
    `SELECT id, email, full_name, password_hash, phone, role_name, created_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  if (rows.length === 0) {
    return null;
  }

  return mapUserRowToEntity(rows[0]);
};

export interface CreateUserInput {
  email: string;
  fullName: string;
  passwordHash: string;
  phone: string | null;
  roleName: string;
}

export const createUser = async (input: CreateUserInput): Promise<UserEntity> => {
  await ensureUsersTable();

  let result: ResultSetHeader;
  try {
    result = await executeQuery<ResultSetHeader>(
      `INSERT INTO users (email, full_name, password_hash, phone, role_name)
       VALUES (?, ?, ?, ?, ?)`,
      [input.email, input.fullName, input.passwordHash, input.phone, input.roleName],
    );
  } catch (error) {
    const errorCode = (error as { code?: string }).code;
    if (errorCode === "ER_DUP_ENTRY") {
      throw new AppError("Email is already registered.", 409);
    }
    throw error;
  }

  const rows = await executeQuery<UserRow[]>(
    `SELECT id, email, full_name, password_hash, phone, role_name, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [result.insertId],
  );

  if (rows.length === 0) {
    throw new AppError("Failed to load created user.", 500);
  }

  return mapUserRowToEntity(rows[0]);
};
