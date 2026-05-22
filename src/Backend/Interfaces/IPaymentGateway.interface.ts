export interface IPaymentGateway {
  createPaymentIntent(amount: number, currency: string): Promise<{ paymentIntentId: string }>;
  capturePayment(paymentIntentId: string): Promise<{ success: boolean }>;
}
