import { Request, Response } from "express";

import { createApiResponse } from "../Core/interceptors";
import { InventoryService } from "../Services/inventory.service";

export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  async listInventory(_req: Request, res: Response) {
    res.json(createApiResponse(this.inventoryService.listInventory()));
  }

  async updateInventory(req: Request, res: Response) {
    const product = this.inventoryService.updateInventory({
      productId: Number(req.params.productId),
      quantity: req.body.quantity,
    });

    res.json(createApiResponse(product));
  }
}
