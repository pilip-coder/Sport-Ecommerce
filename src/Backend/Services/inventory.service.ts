import { AppError } from "../Core/errors";
import type { InventoryItemDto } from "../dto/inventory";
import {
  createInventoryStock,
  listInventoryRows,
  setProductAvailability,
  updateInventoryStock,
} from "../Repositories/inventory.repository";
import { appDataSource } from "../Config/database.config";

interface UpdateInventoryDto {
  productId: number;
  quantity: number;
}

const requireNonNegativeInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} must be a non-negative integer.`, 400);
  }
  return parsed;
};

export class InventoryService {
  listInventory(): Promise<InventoryItemDto[]> {
    return listInventoryRows();
  }

  async createInventory(payload: UpdateInventoryDto): Promise<InventoryItemDto> {
    const productId = Number(payload.productId);
    const quantity = requireNonNegativeInteger(payload.quantity, "Quantity");

    const product = await createInventoryStock(productId, quantity);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    await setProductAvailability(appDataSource, productId, quantity > 0);

    return product;
  }

  async updateInventory(payload: UpdateInventoryDto): Promise<InventoryItemDto> {
    const productId = Number(payload.productId);
    const quantity = requireNonNegativeInteger(payload.quantity, "Quantity");

    const product = await updateInventoryStock(productId, quantity);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    await setProductAvailability(appDataSource, productId, quantity > 0);

    return product;
  }
}
