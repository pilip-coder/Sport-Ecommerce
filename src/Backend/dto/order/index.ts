export interface OrderItemDto {
  productId: number;
  quantity: number;
}

export interface CreateOrderDto {
  userId: number;
  items: OrderItemDto[];
}
