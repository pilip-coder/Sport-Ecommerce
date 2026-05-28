import { AppError } from "../Core/errors";
import { UpdateInventoryDto } from "../dto/inventory";
import { InventoryRepository } from "../Repositories/inventory.repository";
import { requireNonNegativeInteger } from "../Core/utils";

export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  listInventory() {
    return this.inventoryRepository.list();
  }

  updateInventory(payload: UpdateInventoryDto) {
    const productId = Number(payload.productId);
    const quantity = requireNonNegativeInteger(payload.quantity, "Quantity");

    const product = this.inventoryRepository.updateStock(productId, quantity);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }

    return product;
  }
}
