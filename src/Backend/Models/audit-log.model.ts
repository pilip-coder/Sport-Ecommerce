import type { RowDataPacket } from "mysql2/promise";

export interface AuditLogRow extends RowDataPacket {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  metadata: string | null;
  ip_address: string | null;
  created_at: Date;
}

export interface AuditLogEntity {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: Date;
}
