<<<<<<< HEAD
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
=======
import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import type { CreateOrderDto, OrderFilterDto, UpdateOrderStatusDto } from "../dto/order";
import type { OrderEntity } from "../Models/order.model";
import type { OrderItemEntity } from "../Models/order-item.model";
import {
  createOrder,
  findAllOrders,
  findItemsByOrderId,
  findOrderById,
  findFirstUserId,
  seedPostmanCatalog,
  updateOrderStatus,
} from "../Repositories/order.repository";

const validateCreateOrderPayload = (payload: CreateOrderDto): void => {
  if (!payload.customerName || payload.customerName.trim().length === 0) {
    throw new AppError("Customer name is required.", 400);
  }

  if (!payload.address || payload.address.trim().length === 0) {
    throw new AppError("Address is required.", 400);
  }

  if (!payload.phone || payload.phone.trim().length === 0) {
    throw new AppError("Phone number is required.", 400);
  }

  if (!payload.items || payload.items.length === 0) {
    throw new AppError("At least one order item is required.", 400);
  }

  for (const item of payload.items) {
    if (!item.productId || item.productId <= 0) {
      throw new AppError("Valid productId is required for each item.", 400);
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new AppError("Valid quantity (> 0) is required for each item.", 400);
    }
  }
};

export const createUserOrder = async (payload: CreateOrderDto): Promise<{ order: OrderEntity; items: OrderItemEntity[] }> => {
  validateCreateOrderPayload(payload);

  const userId = await findFirstUserId();
  if (!userId) {
    throw new AppError("Create or register a user before creating an order.", 400);
  }

  await seedPostmanCatalog();

  let totalAmount = 0;

  const items: Array<Omit<OrderItemEntity, "id" | "orderId" | "createdAt" | "updatedAt">> = [];

  for (const dtoItem of payload.items) {
    const productRows = (await appDataSource.query(
      "SELECT product_id, product_name, base_price FROM products WHERE product_id = ? LIMIT 1",
      [dtoItem.productId],
    )) as Array<{ product_id: number; product_name: string; base_price: number }>;

    if (productRows.length === 0) {
      throw new AppError(`Product with id ${dtoItem.productId} not found.`, 404);
    }

    const product = productRows[0];
    let unitPrice = Number(product.base_price);
    let sku: string | null = null;
    let productVariantId = dtoItem.productVariantId ?? null;

    const variantRows = (await appDataSource.query(
      productVariantId
        ? "SELECT variant_id, sku, extra_price FROM product_variants WHERE variant_id = ? AND product_id = ? LIMIT 1"
        : "SELECT variant_id, sku, extra_price FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC LIMIT 1",
      productVariantId ? [productVariantId, dtoItem.productId] : [dtoItem.productId],
    )) as Array<{ variant_id: number; sku: string | null; extra_price: number | null }>;

    if (variantRows.length === 0) {
      throw new AppError(`Product ${dtoItem.productId} has no matching variant.`, 404);
    }

    productVariantId = Number(variantRows[0].variant_id);
    sku = variantRows[0].sku;
    unitPrice += Number(variantRows[0].extra_price ?? 0);

    const totalPrice = unitPrice * dtoItem.quantity;
    totalAmount += totalPrice;

    items.push({
      productId: dtoItem.productId,
      productVariantId,
      productName: product.product_name,
      sku,
      quantity: dtoItem.quantity,
      unitPrice,
      totalPrice,
    });
  }

  const orderDate = payload.orderDate ? new Date(payload.orderDate) : new Date();

  const order = await createOrder(
    {
      id: 0,
      userId,
      addressId: null,
      customerName: payload.customerName.trim(),
      address: payload.address.trim(),
      phone: payload.phone.trim(),
      status: "pending",
      totalAmount,
      orderDate,
    },
    items,
  );

  const savedItems = await findItemsByOrderId(order.id);

  return { order, items: savedItems };
};

export const getOrderDetail = async (orderId: number): Promise<{ order: OrderEntity; items: OrderItemEntity[] } | null> => {
  return findOrderById(orderId);
};

export const changeOrderStatus = async (orderId: number, dto: UpdateOrderStatusDto): Promise<void> => {
  if (!dto.status || dto.status.trim().length === 0) {
    throw new AppError("Status is required.", 400);
  }

  const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(dto.status)) {
    throw new AppError(`Invalid status. Valid values: ${validStatuses.join(", ")}`, 400);
  }

  await updateOrderStatus(orderId, dto.status);
};

export const getAllOrders = async (filter: OrderFilterDto) => {
  const page = filter.page ?? 1;
  const limit = filter.limit ?? 10;

  return findAllOrders(page, limit, filter.status);
};
>>>>>>> 2e74274e36722fb30673341fdd231f580c0f1089
