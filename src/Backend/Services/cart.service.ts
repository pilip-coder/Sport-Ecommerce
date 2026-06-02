import { appDataSource } from "../Config/database.config";
import { AppError } from "../Core/errors";
import type { AddCartItemDto, CartItemDto, CartSummaryDto, UpdateCartItemDto } from "../dto/cart";
import type { CreateOrderDto } from "../dto/order";
import type { CartItemEntity } from "../Models/cart.model";
import type { OrderEntity } from "../Models/order.model";
import type { OrderItemEntity } from "../Models/order-item.model";
import {
  addCartItemToRepository,
  clearCartFromRepository,
  listCartItemsFromRepository,
  removeCartItemFromRepository,
  updateCartItemQuantityInRepository,
} from "../Repositories/cart.repository";
import { findItemsByOrderId, findOrderById } from "../Repositories/order.repository";

const toPositiveInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsed;
};

const toNonNegativeInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} must be a non-negative integer.`, 400);
  }

  return parsed;
};

const validateCheckoutPayload = (payload: CreateOrderDto): void => {
  if (!payload.customerName || payload.customerName.trim().length === 0) {
    throw new AppError("Customer name is required.", 400);
  }

  if (!payload.address || payload.address.trim().length === 0) {
    throw new AppError("Address is required.", 400);
  }

  if (!payload.phone || payload.phone.trim().length === 0) {
    throw new AppError("Phone number is required.", 400);
  }
};

const toCartItemDto = (item: CartItemEntity): CartItemDto => ({
  id: item.id,
  userId: item.userId,
  productId: item.productId,
  productVariantId: item.productVariantId,
  productName: item.productName,
  productSlug: item.productSlug,
  productDescription: item.productDescription,
  imageUrl: item.imageUrl,
  sku: item.sku,
  basePrice: item.basePrice,
  extraPrice: item.extraPrice,
  unitPrice: item.unitPrice,
  quantity: item.quantity,
  totalPrice: item.totalPrice,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
});

const toCartSummary = (items: CartItemEntity[]): CartSummaryDto => {
  const mappedItems = items.map(toCartItemDto);

  return {
    items: mappedItems,
    subtotal: items.reduce((total, item) => total + item.totalPrice, 0),
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    itemCount: items.length,
  };
};

const buildCheckoutOrderItems = (
  items: CartItemEntity[],
): Array<Omit<OrderItemEntity, "id" | "orderId" | "createdAt" | "updatedAt">> => {
  return items.map((item) => ({
    productId: item.productId,
    productVariantId: item.productVariantId,
    productName: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  }));
};

export const getCart = async (userId: number): Promise<CartSummaryDto> => {
  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError("Invalid user id.", 400);
  }

  const items = await listCartItemsFromRepository(userId);
  return toCartSummary(items);
};

export const addCartItem = async (userId: number, payload: AddCartItemDto): Promise<CartSummaryDto> => {
  const productId = toPositiveInteger(payload.productId, "productId");
  const quantity = toPositiveInteger(payload.quantity, "quantity");
  const productVariantId = payload.productVariantId == null
    ? undefined
    : toPositiveInteger(payload.productVariantId, "productVariantId");

  await addCartItemToRepository({
    userId,
    productId,
    productVariantId,
    quantity,
  });

  return getCart(userId);
};

export const updateCartItem = async (
  userId: number,
  cartItemIdValue: string,
  payload: UpdateCartItemDto,
): Promise<CartSummaryDto> => {
  const cartItemId = toPositiveInteger(cartItemIdValue, "Cart item id");
  const quantity = toNonNegativeInteger(payload.quantity, "quantity");

  await updateCartItemQuantityInRepository(userId, cartItemId, quantity);
  return getCart(userId);
};

export const deleteCartItem = async (userId: number, cartItemIdValue: string): Promise<CartSummaryDto> => {
  const cartItemId = toPositiveInteger(cartItemIdValue, "Cart item id");
  await removeCartItemFromRepository(userId, cartItemId);
  return getCart(userId);
};

export const clearCart = async (userId: number): Promise<void> => {
  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError("Invalid user id.", 400);
  }

  await clearCartFromRepository(userId);
};

export const checkoutCart = async (
  userId: number,
  payload: CreateOrderDto,
): Promise<{ order: OrderEntity; items: OrderItemEntity[]; cart: CartSummaryDto }> => {
  if (!Number.isInteger(userId) || userId < 1) {
    throw new AppError("Invalid user id.", 400);
  }

  validateCheckoutPayload(payload);

  const cartItems = await listCartItemsFromRepository(userId);
  if (cartItems.length === 0) {
    throw new AppError("Cart is empty.", 400);
  }

  const orderItems = buildCheckoutOrderItems(cartItems);
  const totalAmount = cartItems.reduce((total, item) => total + item.totalPrice, 0);
  const orderDate = payload.orderDate ? new Date(payload.orderDate) : new Date();

  if (payload.orderDate && Number.isNaN(orderDate.getTime())) {
    throw new AppError("orderDate must be a valid date.", 400);
  }

  const queryRunner = appDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  let createdOrderId = 0;

  try {
    const insertResult = (await queryRunner.query(
      `INSERT INTO orders (user_id, address_id, total_amount, order_status, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, null, totalAmount, "pending"],
    )) as { insertId?: number };

    createdOrderId = Number(insertResult.insertId);
    if (!createdOrderId) {
      throw new AppError("Failed to create order.", 500);
    }

    for (const item of orderItems) {
      await queryRunner.query(
        `INSERT INTO order_items (order_id, variant_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [createdOrderId, item.productVariantId, item.quantity, item.totalPrice],
      );
    }

    await queryRunner.query("DELETE FROM cart_items WHERE user_id = ?", [userId]);
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  const order = await findOrderById(createdOrderId);
  if (!order) {
    throw new AppError("Order could not be loaded after checkout.", 500);
  }

  const savedItems = await findItemsByOrderId(createdOrderId);
  const cart = await getCart(userId);

  return {
    order: {
      ...order.order,
      orderDate,
    },
    items: savedItems,
    cart,
  };
};
