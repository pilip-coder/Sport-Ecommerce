import type { RowDataPacket } from "mysql2/promise";

export interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CategoryEntity {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
