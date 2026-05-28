"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productImageUpload = exports.requestLogger = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const multer_1 = __importDefault(require("multer"));
const requestLogger = (req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
};
exports.requestLogger = requestLogger;
const uploadsRoot = node_path_1.default.resolve(process.cwd(), "uploads", "products");
(0, node_fs_1.mkdirSync)(uploadsRoot, { recursive: true });
const imageStorage = multer_1.default.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, uploadsRoot);
    },
    filename: (_req, file, callback) => {
        const extension = node_path_1.default.extname(file.originalname || "").toLowerCase() || ".jpg";
        const safeBaseName = node_path_1.default
            .basename(file.originalname, node_path_1.default.extname(file.originalname))
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 50) || "product";
        callback(null, `${Date.now()}-${safeBaseName}${extension}`);
    },
});
const imageFileFilter = (_req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
        callback(null, true);
        return;
    }
    callback(new Error("Only image files are allowed."));
};
exports.productImageUpload = (0, multer_1.default)({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
});
