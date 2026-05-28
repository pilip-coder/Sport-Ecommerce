import { AppError } from "../Core/errors";
import { CreateOrderDto } from "../dto/order";
import { Order, OrderItem } from "../Models/order.model";
import { OrderRepository } from "../Repositories/order.repository";
import { ProductRepository } from "../Repositories/product.repository";
import { requirePositiveInteger, requireString } from "../Core/utils";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async listOrders() {
    return this.orderRepository.list();
  }

  async getOrder(orderId: number) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new AppError("Order not found.", 404);
    }

    return order;
  }

  async createOrder(payload: CreateOrderDto, userId: number | null): Promise<Order> {
    const customerName = requireString(payload.customerName, "Customer name");
    const address = requireString(payload.address, "Address");
    const phoneNumber = requireString(payload.phoneNumber, "Phone number");

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new AppError("At least one order item is required.", 400);
    }

    const items: OrderItem[] = [];

    for (const item of payload.items) {
      const productId = requirePositiveInteger(item.productId, "Product ID");
      const quantity = requirePositiveInteger(item.quantity, "Quantity");
      const product = await this.productRepository.findById(productId);

      if (!product || product.status !== "active") {
        throw new AppError(`Product ${productId} is not available.`, 404);
      }

      if (product.stockQuantity < quantity) {
        throw new AppError(`Not enough stock for ${product.productName}.`, 400);
      }

      items.push({
        productId: product.id,
        productName: product.productName,
        quantity,
        price: product.price,
        subtotal: Number((product.price * quantity).toFixed(2)),
      });
    }

    for (const item of items) {
      const product = await this.productRepository.findById(item.productId);
      if (product) {
        await this.productRepository.update(product.id, {
          stockQuantity: product.stockQuantity - item.quantity,
        });
      }
    }

    const totalPrice = Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));

    return this.orderRepository.create({
      userId,
      customerName,
      address,
      phoneNumber,
      items,
      totalPrice,
      status: "placed",
      orderedAt: new Date().toISOString(),
    });
  }

  async markOrderPaid(orderId: number): Promise<Order> {
    const updatedOrder = await this.orderRepository.updateStatus(orderId, "paid");
    if (!updatedOrder) {
      throw new AppError("Order not found.", 404);
    }

    return updatedOrder;
  }
}
