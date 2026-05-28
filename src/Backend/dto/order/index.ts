export interface OrderItemDto {
  productId: number;
  productVariantId?: number | null;
  quantity: number;
}

export interface CreateOrderDto {
  customerName: string;
  address: string;
  phone: string;
  items: OrderItemDto[];
  orderDate?: string;
}

export interface UpdateOrderStatusDto {
  status: string;
}

export interface OrderFilterDto {
  userId?: number;
  status?: string;
  page?: number;
  limit?: number;
}
