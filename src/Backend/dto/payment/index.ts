export interface CreatePaymentDto {
  orderId: number;
  amount?: number;
  currency?: string;
  provider?: string;
  method?: string;
  status?: string;
  transactionId?: string | null;
}

export interface UpdatePaymentStatusDto {
  status: string;
  transactionId?: string | null;
}

export interface PaymentListQueryDto {
  orderId?: string;
  status?: string;
}
