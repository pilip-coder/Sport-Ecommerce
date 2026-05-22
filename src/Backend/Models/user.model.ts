import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from "typeorm";

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryColumn({ type: "int", name: "user_id" })
  id!: number;

  @Column({ type: "int", name: "role_id", nullable: true })
  roleId!: number | null;

  @Column({ type: "varchar", name: "full_name", length: 100 })
  fullName!: string;

  @Column({ type: "varchar", length: 100 })
  email!: string;

  @Column({ type: "varchar", name: "password", length: 255 })
  passwordHash!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: "enum", enum: ["active", "inactive"], default: "active", nullable: true })
  status!: "active" | "inactive" | null;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt!: Date;

  get roleName(): string {
    if (this.roleId === 1) {
      return "Admin";
    }
    if (this.roleId === 2) {
      return "Staff";
    }
    if (this.roleId === 3) {
      return "Customer";
    }
    return "Customer";
  }
}

export interface AuthUserResponse {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  roleName: string;
}
