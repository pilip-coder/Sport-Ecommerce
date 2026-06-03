export interface AdminListQueryDto {
  search?: string;
}

export interface AdminUpdateUserStatusDto {
  status: "active" | "inactive";
}

export interface AdminUpdatePaymentStatusDto {
  status: string;
}
