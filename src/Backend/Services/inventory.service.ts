import { AppError } from "../Core/errors";
import type { InventoryItemDto } from "../dto/inventory";

interface UpdateInventoryDto {
  productId: number;
  quantity: number;
}

interface InventoryRepositoryLike {
  list(): InventoryItemDto[];
  updateStock(productId: number, quantity: number): InventoryItemDto | null;
}

const requireNonNegativeInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new AppError(`${fieldName} must be a non-negative integer.`, 400);
  }
  return parsed;
};

export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepositoryLike) {}

  listInventory(): InventoryItemDto[] {
    return this.inventoryRepository.list();
  }

  updateInventory(payload: UpdateInventoryDto): InventoryItemDto {
    const productId = Number(payload.productId);
    const quantity = requireNonNegativeInteger(payload.quantity, "Quantity");

    const product = this.inventoryRepository.updateStock(productId, quantity);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    return product;
  }
}
