import { Request, Response } from "express";

import { createApiResponse } from "../Core/interceptors";
import { ProductService } from "../Services/product.service";

export class ProductController {
  constructor(private readonly productService: ProductService) {}

  async listProducts(req: Request, res: Response) {
    const products = await this.productService.listProducts({
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
    });

    res.json(createApiResponse(products));
  }

  async listCategories(_req: Request, res: Response) {
    res.json(createApiResponse(this.productService.getCategories()));
  }

  async getProduct(req: Request, res: Response) {
    res.json(createApiResponse(await this.productService.getProduct(Number(req.params.productId))));
  }
}
