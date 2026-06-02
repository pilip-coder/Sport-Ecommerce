import { Request, Response } from "express";

import { createApiResponse } from "../Core/interceptors";
import { InventoryService } from "../Services/inventory.service";

export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  listInventory = async (_req: Request, res: Response) => {
    const inventory = await this.inventoryService.listInventory();
    res.json(createApiResponse(inventory));
  }

  createInventory = async (req: Request, res: Response) => {
    const product = await this.inventoryService.createInventory({
      productId: Number(req.body.productId),
      quantity: req.body.quantity,
    });

    res.status(201).json(createApiResponse(product));
  }

  updateInventory = async (req: Request, res: Response) => {
    const product = await this.inventoryService.updateInventory({
      productId: Number(req.params.productId),
      quantity: req.body.quantity,
    });

    res.json(createApiResponse(product));
  };
}
