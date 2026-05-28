import { mkdirSync } from "node:fs";
import path from "node:path";

import { NextFunction, Request, Response } from "express";
import multer from "multer";

export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
};

const uploadsRoot = path.resolve(process.cwd(), "uploads", "products");
mkdirSync(uploadsRoot, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadsRoot);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeBaseName = path
      .basename(file.originalname, path.extname(file.originalname))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "product";

    callback(null, `${Date.now()}-${safeBaseName}${extension}`);
  },
});

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  if (file.mimetype.startsWith("image/")) {
    callback(null, true);
    return;
  }

  callback(new Error("Only image files are allowed."));
};

export const productImageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});
