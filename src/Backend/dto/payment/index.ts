export interface CreatePaymentDto {
  orderId: number;
  amount: number;
  currency: string;
}
