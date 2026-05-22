import type { RowDataPacket } from "mysql2/promise";

export interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  full_name: string;
  password_hash: string;
  phone: string | null;
  role_name: string;
  created_at: Date;
  updated_at?: Date;
}

export interface UserEntity {
  id: number;
  email: string;
  fullName: string;
  passwordHash: string;
  phone: string | null;
  roleName: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AuthUserResponse {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  roleName: string;
}
