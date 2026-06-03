import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import type { CreateOrderDto, OrderFilterDto, UpdateOrderStatusDto } from "../dto/order";
import type { OrderEntity } from "../Models/order.model";
import type { OrderItemEntity } from "../Models/order-item.model";
import { ensureProductHasDefaultVariantAndStock } from "../Repositories/catalog.repository";
import {
  createOrder,
  findAllOrders,
  findItemsByOrderId,
  findOrderById,
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

export const createUserOrder = async (userId: number, payload: CreateOrderDto): Promise<{ order: OrderEntity; items: OrderItemEntity[] }> => {
  validateCreateOrderPayload(payload);

  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError("A valid logged-in user is required to create an order.", 401);
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
      await ensureProductHasDefaultVariantAndStock(dtoItem.productId, dtoItem.quantity);

      const recoveredVariantRows = (await appDataSource.query(
        productVariantId
          ? "SELECT variant_id, sku, extra_price FROM product_variants WHERE variant_id = ? AND product_id = ? LIMIT 1"
          : "SELECT variant_id, sku, extra_price FROM product_variants WHERE product_id = ? ORDER BY variant_id ASC LIMIT 1",
        productVariantId ? [productVariantId, dtoItem.productId] : [dtoItem.productId],
      )) as Array<{ variant_id: number; sku: string | null; extra_price: number | null }>;

      if (recoveredVariantRows.length === 0) {
        throw new AppError(`Product ${dtoItem.productId} has no matching variant.`, 404);
      }

      variantRows.push(recoveredVariantRows[0]);
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
