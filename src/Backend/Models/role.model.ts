import type { RowDataPacket } from "mysql2/promise";

export interface RoleRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RoleEntity {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
