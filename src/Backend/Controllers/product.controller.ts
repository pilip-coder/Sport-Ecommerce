import { Request, Response } from "express";

import { createApiResponse } from "../Core/interceptors";
import { getCategoryList } from "../Services/category.service";
import { getProductDetail, getProductList } from "../Services/catalog.service";

export class ProductController {
  async listProducts(req: Request, res: Response) {
    const products = await getProductList({
      page: "1",
      limit: "50",
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      category: typeof req.query.category === "string" ? req.query.category : undefined,
    });

    res.json(createApiResponse(products));
  }

  async listCategories(_req: Request, res: Response) {
    res.json(createApiResponse(await getCategoryList({})));
  }

  async getProduct(req: Request, res: Response) {
    res.json(createApiResponse(await getProductDetail(String(req.params.productId))));
  }
}
